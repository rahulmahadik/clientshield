import { useCallback, useEffect, useRef, useState } from "react";
import { fetchToday, resolveApproval, resetDemoDay, setAllAgentsStatus } from "../api";
import type { TodayReport } from "../api";
import { LevelChip } from "../LevelChip";

const POLL_MS = 10_000;

type NavTarget = "approvals" | "briefing" | "agents" | "log";

interface StoppedItem {
  id: number;
  agent: string;
  action: string;
  reason: string;
  rule_ids: string[];
  amount: number | null;
}

interface ApprovalItem {
  id: number;
  agent: string;
  action: string;
  reason: string;
  rule_ids: string[];
  amount: number | null;
  data_level: string;
}

interface FeedItem {
  id: number;
  created_at: string;
  agent: string;
  action: string;
  decision: string;
  reason: string;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Singapore",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning, Mei";
  if (hour < 18) return "Good afternoon, Mei";
  return "Good evening, Mei";
}

function DecisionBadge({ decision }: { decision: string }) {
  return <span className={`decision decision-${decision.toLowerCase()}`}>{decision}</span>;
}

function sg(amount: number) {
  return `SGD ${amount.toLocaleString("en-SG")}`;
}

function Banner({
  today,
  onNeeds,
  onBriefing,
  onReplay,
  replaying,
}: {
  today: TodayReport;
  onNeeds: () => void;
  onBriefing: () => void;
  onReplay: () => void;
  replaying: boolean;
}) {
  const { counters, approvals, integrity, suite } = today;
  const missed = suite?.missed_violations ?? 0;
  const allClear =
    approvals.count === 0 && missed === 0 && integrity.ok && counters.actions > 0;
  const tone = !integrity.ok ? "red" : allClear ? "green" : "amber";
  const status =
    !integrity.ok
      ? "The audit log needs attention — integrity check failed."
      : allClear
        ? "All clear — nothing needs you right now."
        : approvals.count > 0
          ? `${approvals.count} thing${approvals.count === 1 ? "" : "s"} need you.`
          : "The gateway caught something for you to review.";
  return (
    <div className={`today-banner banner-${tone}`}>
      <div className="banner-main">
        <span className="banner-greeting">{greeting()}</span>
        <span className="banner-status">{status}</span>
        <span className="banner-meta">
          {counters.actions} actions checked ·{" "}
          {suite ? `${missed} missed violations` : "suite not run yet"}
          {counters.figures_caught > 0
            ? ` · ${counters.figures_caught} made-up figure${counters.figures_caught === 1 ? "" : "s"} caught`
            : ""}
        </span>
      </div>
      <div className="banner-actions">
        <button type="button" className="banner-button needs" onClick={onNeeds}>
          Needs you{approvals.count > 0 ? ` (${approvals.count})` : ""}
        </button>
        <button type="button" className="banner-button" onClick={onBriefing}>
          Briefing
        </button>
        <button
          type="button"
          className="banner-button replay"
          onClick={onReplay}
          disabled={replaying}
          title="Clear the log and replay a full sample day"
        >
          {replaying ? "Replaying…" : "Replay sample day"}
        </button>
      </div>
    </div>
  );
}

function Funnel({ today }: { today: TodayReport }) {
  const { counters } = today;
  const total = Math.max(1, counters.actions);
  const segments = [
    { key: "allowed", label: "allowed", value: counters.allowed, className: "funnel-allowed" },
    { key: "held", label: "held", value: counters.held, className: "funnel-held" },
    { key: "blocked", label: "blocked", value: counters.blocked, className: "funnel-blocked" },
  ];
  if (counters.actions === 0) {
    return (
      <div className="funnel-wrap">
        <div className="funnel-empty">No actions yet — replay the sample day to see the gateway work.</div>
      </div>
    );
  }
  return (
    <div className="funnel-wrap">
      <div className="funnel-label">
        <span className="funnel-tried">{counters.actions} tried</span>
        <span className="funnel-legend">
          {segments.map((segment) => (
            <span key={segment.key} className={`funnel-legend-item ${segment.className}`}>
              <span className="funnel-swatch" />
              {segment.label} <strong>{segment.value}</strong>
            </span>
          ))}
        </span>
      </div>
      <div className="funnel-bar" role="img" aria-label={`Of ${counters.actions} actions: ${counters.allowed} allowed, ${counters.held} held, ${counters.blocked} blocked`}>
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`funnel-segment ${segment.className}`}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label}: ${segment.value}`}
          />
        ))}
      </div>
    </div>
  );
}

function StoppedCard({
  stopped,
  onSeeWhy,
}: {
  stopped: StoppedItem[];
  onSeeWhy: (id: number) => void;
}) {
  return (
    <div className="today-card today-card-wide">
      <span className="today-card-label">Stopped today</span>
      {stopped.length === 0 && (
        <p className="today-empty">
          Nothing was stopped — every agent action stayed within the rules.
        </p>
      )}
      <ul className="stopped-list">
        {stopped.map((item) => (
          <li key={item.id}>
            <div className="stopped-main">
              <span className="stopped-agent">{item.agent}</span>
              <span className="stopped-reason">{item.reason}</span>
            </div>
            <div className="stopped-side">
              {item.amount !== null && (
                <span className="money-chip">{sg(item.amount)}</span>
              )}
              {item.rule_ids.map((rule) => (
                <span key={rule} className="rule-id-chip">
                  {rule}
                </span>
              ))}
              <button
                type="button"
                className="see-why"
                onClick={() => onSeeWhy(item.id)}
              >
                see why →
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NeedsYouCard({
  items,
  onResolved,
}: {
  items: ApprovalItem[];
  onResolved: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: number, decision: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await resolveApproval(id, decision, "");
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record the decision");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="today-card today-card-wide">
      <span className="today-card-label">Needs you</span>
      {items.length === 0 && (
        <p className="today-empty">
          Nothing is waiting — the agents are all within policy. ☕
        </p>
      )}
      {error && <p className="try-error">{error}</p>}
      <ul className="needs-list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="needs-main">
              <span className="stopped-agent">{item.agent}</span>
              <span className="stopped-reason">{item.reason}</span>
            </div>
            <div className="needs-side">
              {item.amount !== null && (
                <span className="money-chip">{sg(item.amount)}</span>
              )}
              <LevelChip id={item.data_level} />
              {item.rule_ids.map((rule) => (
                <span key={rule} className="rule-id-chip">
                  {rule}
                </span>
              ))}
              <span className="needs-buttons">
                <button
                  type="button"
                  className="mini-approve"
                  disabled={busyId === item.id}
                  onClick={() => decide(item.id, "approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="mini-reject"
                  disabled={busyId === item.id}
                  onClick={() => decide(item.id, "reject")}
                >
                  Reject
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feed({ feed }: { feed: FeedItem[] }) {
  return (
    <div className="today-card">
      <span className="today-card-label">Live activity · last 10</span>
      {feed.length === 0 && (
        <p className="today-empty">The agents haven't acted yet — press Replay sample day above.</p>
      )}
      <ul className="feed-list">
        {feed.map((item) => (
          <li key={item.id}>
            <span className="feed-time">{formatTime(item.created_at)}</span>
            <span className="feed-agent">{item.agent}</span>
            <span className="feed-action">{item.action}</span>
            <span className="feed-reason" title={item.reason}>
              {item.reason}
            </span>
            <DecisionBadge decision={item.decision} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrustCard({ today, onChanged }: { today: TodayReport; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  async function pauseAll(status: "active" | "paused") {
    setBusy(true);
    try {
      await setAllAgentsStatus(status);
      onChanged();
    } catch {
      // 401 opens the sign-in modal automatically
    } finally {
      setBusy(false);
    }
  }
  const anyPaused = today.agents.some((agent) => agent.status === "paused");
  return (
    <div className="today-card">
      <span className="today-card-label">Agent trust</span>
      <div className="today-trust-list">
        {today.agents.map((agent) => {
          const clamped = Math.max(0, Math.min(100, agent.trust_score));
          const tone =
            clamped >= 80 ? "var(--green)" : clamped >= 50 ? "var(--amber)" : "var(--red)";
          return (
            <div className="today-trust" key={agent.id}>
              <span className="today-trust-name">
                {agent.name}
                {agent.status === "paused" && <span className="today-paused">paused</span>}
              </span>
              <span className="trust-track">
                <span className="trust-fill" style={{ width: `${clamped}%`, background: tone }} />
              </span>
              <span className="trust-label">{clamped}</span>
            </div>
          );
        })}
      </div>
      <div className="kill-switch-row">
        <button
          type="button"
          className="kill-switch"
          onClick={() => pauseAll("paused")}
          disabled={busy}
        >
          Pause all agents
        </button>
        {anyPaused && (
          <button
            type="button"
            className="resume-all"
            onClick={() => pauseAll("active")}
            disabled={busy}
          >
            Resume all
          </button>
        )}
      </div>
    </div>
  );
}

function ProofCard({ today }: { today: TodayReport }) {
  const { suite, integrity, classifier, planner, counters } = today;
  const plannerText =
    !planner.key_set
      ? "rule-based demo mode"
      : planner.status === "ok"
        ? "Qwen live"
        : "rule-based demo mode, Qwen-ready";
  return (
    <div className="today-card proof-card">
      <span className="today-card-label">Proof</span>
      <ul className="proof-list">
        <li className={suite && suite.missed_violations === 0 ? "proof-ok" : "proof-bad"}>
          Scenario suite {suite ? `${suite.score}/${suite.total} · ${suite.missed_violations} missed · ${suite.false_positives ?? 0} false positives` : "not run yet"}
        </li>
        <li className={integrity.ok ? "proof-ok" : "proof-bad"}>
          Log integrity {integrity.ok ? "OK" : `broken at #${integrity.broken_row_id}`} · {integrity.checked} rows
        </li>
        {classifier && (
          <li className={classifier.correct === classifier.total ? "proof-ok" : "proof-bad"}>
            Data labels {classifier.correct}/{classifier.total} correct
          </li>
        )}
        <li className="proof-ok">
          Planner: {plannerText}
          {counters.injections > 0 ? ` · ${counters.injections} injection${counters.injections === 1 ? "" : "s"} caught` : ""}
        </li>
      </ul>
    </div>
  );
}

export function TodayPage({
  refreshKey = 0,
  onNavigate,
  onSeeWhy,
}: {
  refreshKey?: number;
  onNavigate?: (target: NavTarget) => void;
  onSeeWhy?: (actionId: number) => void;
}) {
  const [today, setToday] = useState<TodayReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  const firstRefreshKey = useRef(refreshKey);

  const refresh = useCallback(() => {
    fetchToday()
      .then(setToday)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load today"),
      );
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("cs-welcome-dismissed") === "1";
    setWelcomeDismissed(stored);
    document.documentElement.dataset.theme =
      window.localStorage.getItem("cs-theme") === "light" ? "light" : "dark";
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function replay() {
    if (
      !window.confirm(
        "Replay the sample day? The log and approvals are cleared and a full Lumen Studio day is replayed.",
      )
    ) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const result = await resetDemoDay();
      setToday(result.today);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to replay the sample day");
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    if (refreshKey !== firstRefreshKey.current) {
      refresh();
    }
  }, [refreshKey, refresh]);

  if (error && !today) {
    return (
      <section className="page">
        <div className="state-banner state-error">{error}</div>
      </section>
    );
  }
  if (!today) {
    return (
      <section className="page">
        <div className="state-banner">Loading today…</div>
      </section>
    );
  }

  return (
    <section className="page today-page">
      {!welcomeDismissed && (
        <div className="welcome-strip">
          <button
            type="button"
            className="welcome-dismiss"
            aria-label="Dismiss"
            onClick={() => {
              window.localStorage.setItem("cs-welcome-dismissed", "1");
              setWelcomeDismissed(true);
            }}
          >
            ✕
          </button>
          <p className="welcome-copy">
            Mei runs Lumen Studio alone. Four AI agents work for her.
            ClientShield checks every move before it happens.
          </p>
          <div className="welcome-actions">
            <button type="button" className="welcome-try" onClick={() => onNavigate?.("agents")}>
              Watch a rogue agent get caught
            </button>
            <button type="button" className="welcome-try" onClick={() => onNavigate?.("log")}>
              See a made-up number flagged
            </button>
            <button type="button" className="welcome-try" onClick={() => onNavigate?.("briefing")}>
              Read this morning's briefing
            </button>
          </div>
        </div>
      )}

      <Banner
        today={today}
        onNeeds={() => onNavigate?.("approvals")}
        onBriefing={() => onNavigate?.("briefing")}
        onReplay={replay}
        replaying={resetting}
      />

      <Funnel today={today} />

      <div className="today-duo">
        <StoppedCard stopped={today.stopped} onSeeWhy={(id) => onSeeWhy?.(id)} />
        <NeedsYouCard items={today.approvals.items} onResolved={refresh} />
      </div>

      <Feed feed={today.feed} />

      <div className="today-duo">
        <TrustCard today={today} onChanged={refresh} />
        <ProofCard today={today} />
      </div>
    </section>
  );
}
