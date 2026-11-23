import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBriefings, fetchSettings, generateBriefing } from "../api";
import type { Briefing } from "../api";

type SectionKind = "stopped" | "needs" | "figures" | "trust" | "extra";

interface ParsedSection {
  kind: SectionKind;
  title: string;
  prose: string[];
  bullets: string[];
}

interface ParsedBriefing {
  headline: string;
  activity: string | null;
  sections: ParsedSection[];
  recommendation: string | null;
}

const SECTION_META: Record<SectionKind, { icon: string; label: string; tone: string }> = {
  stopped: { icon: "✕", label: "Stopped", tone: "red" },
  needs: { icon: "!", label: "Needs you", tone: "amber" },
  figures: { icon: "≠", label: "Made-up figures", tone: "red" },
  trust: { icon: "◆", label: "Trust", tone: "blue" },
  extra: { icon: "☰", label: "Notes", tone: "ink" },
};

const KIND_MATCHERS: [SectionKind, RegExp][] = [
  ["stopped", /what was stopped|stopped and why/i],
  ["needs", /waiting for your approval|need(s)? you/i],
  ["figures", /made-up figures/i],
  ["trust", /trust changes/i],
];

function classify(paragraph: string): SectionKind | "activity" | "recommendation" | null {
  if (KIND_MATCHERS.some(([, pattern]) => pattern.test(paragraph))) {
    return KIND_MATCHERS.find(([, pattern]) => pattern.test(paragraph))![0];
  }
  if (/what the agents did/i.test(paragraph)) return "activity";
  if (/recommended action/i.test(paragraph)) return "recommendation";
  return null;
}

function parseBriefing(briefing: Briefing): ParsedBriefing {
  const paragraphs = briefing.body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // The template (and the LLM) open the body with the headline — show it once.
  const first = paragraphs[0] ?? "";
  const headlineMatches =
    first.length > 20 &&
    (first === briefing.headline ||
      first.slice(0, 60).toLowerCase() === briefing.headline.slice(0, 60).toLowerCase() ||
      briefing.headline.slice(0, 40).toLowerCase().includes(first.slice(0, 40).toLowerCase()));
  const body = headlineMatches ? paragraphs.slice(1) : paragraphs;

  let activity: string | null = null;
  let recommendation: string | null = null;
  const sections: ParsedSection[] = [];

  for (const paragraph of body) {
    const kind = classify(paragraph);
    const [firstLine, ...rest] = paragraph.split("\n");
    if (kind === "activity") {
      activity = firstLine.replace(/^.*?—\s*/, "").trim() || firstLine;
      continue;
    }
    if (kind === "recommendation") {
      recommendation = firstLine.replace(/^.*?—\s*/, "").trim() || firstLine;
      if (rest.length > 0) recommendation += " " + rest.join(" ").trim();
      continue;
    }
    if (kind === null) {
      // Unknown shape: keep the text, best effort as a notes card.
      sections.push({
        kind: "extra",
        title: SECTION_META.extra.label,
        prose: [paragraph.replace(/^•\s*/gm, "").split("\n").join(" ")],
        bullets: [],
      });
      continue;
    }
    const meta = SECTION_META[kind];
    const section: ParsedSection = {
      kind,
      title: meta.label,
      prose: [],
      bullets: [],
    };
    const contentLines = [...rest];
    // The header line itself may carry prose after the colon.
    const afterColon = firstLine.replace(/^[^:]*:\s*/, "").trim();
    if (afterColon && !afterColon.startsWith("•")) section.prose.push(afterColon);
    for (const line of contentLines) {
      const text = line.trim();
      if (!text) continue;
      if (text.startsWith("•")) {
        section.bullets.push(text.replace(/^•\s*/, ""));
      } else {
        section.prose.push(text);
      }
    }
    sections.push(section);
  }

  return { headline: briefing.headline, activity, sections, recommendation };
}

/** Inline chips: SGD amounts (green) and rule ids (blue). */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(SGD [\d,]+(?:\.\d+)?|\bR\d{2}\b)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (/^SGD /.test(part)) {
          return (
            <span key={index} className="money-inline">
              {part}
            </span>
          );
        }
        if (/^R\d{2}$/.test(part)) {
          return (
            <span key={index} className="rule-id-chip">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

const STAT_META: { key: string; label: string; tone: string }[] = [
  { key: "ALLOW", label: "allowed", tone: "green" },
  { key: "HOLD", label: "held", tone: "amber" },
  { key: "BLOCK", label: "blocked", tone: "red" },
  { key: "figures_caught", label: "made-up figures", tone: "red" },
];

export function BriefingPage({
  onOpenApprovals,
}: {
  onOpenApprovals: () => void;
}) {
  const [briefings, setBriefings] = useState<Briefing[] | null>(null);
  const [selected, setSelected] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [briefingTime, setBriefingTime] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const refresh = useCallback(() => {
    fetchBriefings()
      .then((rows) => {
        setBriefings(rows);
        setSelected((current) =>
          current
            ? rows.find((row) => row.id === current.id) ?? rows[0] ?? null
            : rows[0] ?? null,
        );
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load briefings"),
      );
  }, []);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    fetchSettings()
      .then((settings) => setBriefingTime(settings.briefing_time))
      .catch(() => setBriefingTime(null));
  }, []);

  const parsed = useMemo(
    () => (selected ? parseBriefing(selected) : null),
    [selected],
  );

  function toggleListen() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    if (!selected) return;
    const utterance = new SpeechSynthesisUtterance(
      `${selected.headline}. ${selected.body.replace(/•\s*/g, "")}`,
    );
    utterance.lang = "en-US";
    utterance.rate = 0.97;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const briefing = await generateBriefing();
      refresh();
      setSelected(briefing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate the briefing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Briefing</h2>
          <p className="page-sub">
            The morning briefing for Mei, written from yesterday's and today's
            action log. A scheduled task generates it automatically every day
            at {briefingTime ?? "07:00"} (Asia/Singapore).
          </p>
        </div>
        <div className="briefing-actions">
          <button
            type="button"
            className="try-submit"
            onClick={generate}
            disabled={busy}
          >
            {busy ? "Writing…" : "Generate today's briefing"}
          </button>
          <button
            type="button"
            className="listen-button"
            onClick={toggleListen}
            disabled={!selected || !window.speechSynthesis}
            title="Read the briefing aloud with the browser's voice"
          >
            {speaking ? "Stop" : "Listen"}
          </button>
        </div>
      </div>
      {error && <div className="state-banner state-error">{error}</div>}
      {briefings === null && !error && (
        <div className="state-banner">Loading briefings…</div>
      )}
      {briefings !== null && briefings.length === 0 && (
        <div className="state-banner">
          No briefings yet. Press "Generate today's briefing".
        </div>
      )}

      {parsed && selected && (
        <article className="briefing">
          <header className="briefing-head">
            <div className="briefing-date">{selected.briefing_date}</div>
            <h3 className="briefing-headline">{parsed.headline}</h3>
          </header>

          <div className="briefing-stats">
            {STAT_META.map(({ key, label, tone }) => (
              <div key={key} className={`brief-stat brief-stat-${tone}`}>
                <span className="brief-stat-value">
                  {selected.counts?.[key] ?? 0}
                </span>
                <span className="brief-stat-label">{label}</span>
              </div>
            ))}
          </div>

          {parsed.activity && (
            <p className="briefing-activity">
              <RichText text={parsed.activity} />
            </p>
          )}

          <div className="briefing-sections">
            {parsed.sections.map((section, index) => {
              const meta = SECTION_META[section.kind];
              return (
                <div key={index} className={`brief-section brief-${meta.tone}`}>
                  <div className="brief-section-head">
                    <span className={`brief-icon brief-icon-${meta.tone}`}>
                      {meta.icon}
                    </span>
                    <span className="brief-section-title">{section.title}</span>
                  </div>
                  {section.prose.map((line, i) => (
                    <p key={i} className="brief-prose">
                      <RichText text={line} />
                    </p>
                  ))}
                  {section.bullets.length > 0 && (
                    <ul className="brief-list">
                      {section.bullets.map((bullet, i) => (
                        <li key={i}>
                          <RichText text={bullet} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {parsed.recommendation && (
            <div className="brief-recommendation">
              <span className="brief-recommendation-label">
                Recommended action
              </span>
              <p>
                <RichText text={parsed.recommendation} />
              </p>
              <button type="button" className="try-submit" onClick={onOpenApprovals}>
                Open Approvals →
              </button>
            </div>
          )}
        </article>
      )}

      {briefings !== null && briefings.length > 1 && (
        <div className="briefing-history">
          <span className="today-card-label">History</span>
          <div className="briefing-history-list">
            {briefings.map((briefing) => (
              <button
                key={briefing.id}
                type="button"
                className={`briefing-history-item ${selected?.id === briefing.id ? "history-active" : ""}`}
                onClick={() => setSelected(briefing)}
              >
                <span className="briefing-date">{briefing.briefing_date}</span>
                <span className="briefing-history-headline">{briefing.headline}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
