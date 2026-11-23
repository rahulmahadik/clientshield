import { useEffect, useState } from "react";
import {
  fetchClassifierReport,
  fetchLastRedTeamRun,
  fetchLastSuiteRun,
  runRedTeam,
  runScenarioSuite,
} from "../api";
import type { RedTeamReport } from "../api";
import type {
  ClassifierReport,
  ScenarioResult,
  ScenarioSuiteReport,
} from "../api";

function formatRunTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
import { sensitivityMeta } from "../labels";

function DecisionBadge({ decision, muted = false }: { decision: string; muted?: boolean }) {
  return (
    <span className={`decision decision-${decision.toLowerCase()} ${muted ? "decision-muted" : ""}`}>
      {decision}
    </span>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`check ${ok ? "check-ok" : "check-fail"}`}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function ScenarioCard({ result }: { result: ScenarioResult }) {
  const [open, setOpen] = useState(false);
  const meta = sensitivityMeta(result.actual_data_level);
  const allOk = result.score === 3;

  return (
    <div className={`scenario-card ${allOk ? "" : "scenario-missed"}`}>
      <div className="scenario-head">
        <div className="scenario-id">
          {result.id}
          {result.custom && <span className="scenario-custom">ours</span>}
        </div>
        <div className="scenario-name">{result.name}</div>
        <span className="scenario-score">
          {result.score}/3
        </span>
      </div>
      <p className="scenario-trigger">{result.trigger}</p>
      <div className="scenario-expected">
        <span className="expected-label">expected</span>
        <DecisionBadge decision={result.expected_decision} muted />
        <span className="expected-rules">{result.expected_rules.join(" · ")}</span>
        <span className="expected-arrow">→</span>
        <span className="expected-label">actual</span>
        <DecisionBadge decision={result.actual_decision} />
        <span className="expected-rules">{result.actual_rules.join(" · ")}</span>
        <span className="level-chip" style={{ ["--chip" as string]: meta.dot }}>
          <span className="chip-dot" style={{ background: meta.dot }} />
          {meta.label}
        </span>
      </div>
      <div className="scenario-checks">
        <Check ok={result.checks.decision} label="decision" />
        <Check ok={result.checks.rules} label="rules" />
        <Check ok={result.checks.evidence} label="evidence" />
      </div>
      <button
        type="button"
        className="scenario-toggle"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide steps" : `Show ${result.steps.length} steps`}
      </button>
      {open && (
        <ol className="run-list">
          {result.steps.map((step, index) => (
            <li key={index} className="run-step">
              <div className="run-step-head">
                <span className="run-step-n">{index + 1}</span>
                <span className="log-action">{step.action}</span>
                <span className="run-step-reason">{step.reason}</span>
                <span className="run-step-badges">
                  {step.injection && (
                    <span className="injection-flag">prompt injection</span>
                  )}
                  <DecisionBadge decision={step.decision} />
                </span>
              </div>
              {step.decision !== "ALLOW" && (
                <div className="log-body">
                  <dl className="log-terms">
                    <div className="log-term">
                      <dt>rules</dt>
                      <dd>{step.rule_ids.join(", ") || "—"}</dd>
                    </div>
                    <div className="log-term">
                      <dt>evidence</dt>
                      <dd>{step.evidence}</dd>
                    </div>
                    {step.injection && (
                      <div className="log-term">
                        <dt>injection line</dt>
                        <dd>{step.injection.line}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RedTeamPanel() {
  const [redTeam, setRedTeam] = useState<RedTeamReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLastRedTeamRun()
      .then((run) => {
        if (run && Array.isArray(run.results) && run.results.length > 0) {
          setRedTeam(run);
        }
      })
      .catch(() => {});
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setRedTeam(await runRedTeam());
    } catch (e) {
      setError(e instanceof Error ? e.message : "The red-team run failed");
    } finally {
      setBusy(false);
    }
  }

  const ranAt = redTeam?.created_at
    ? new Date(redTeam.created_at).toLocaleString("en-SG", {
        timeZone: "Asia/Singapore",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="redteam-panel">
      <div className="redteam-head">
        <div>
          <span className="redteam-title">Red team</span>
          <p className="redteam-sub">
            Twelve adversarial cases that must be caught (look-alike domains,
            split payments, hidden instructions, forged tokens, the kill
            switch) and six clean look-alikes that must sail through — zero
            false alarms.
          </p>
        </div>
        <button type="button" className="try-submit" onClick={run} disabled={busy}>
          {busy ? "Running…" : "Run red-team pack"}
        </button>
      </div>
      {error && <p className="try-error">{error}</p>}
      {redTeam && (
        <>
          <div className="redteam-banner">
            <span className="redteam-score">
              {redTeam.caught}/{redTeam.attacks_total} caught
            </span>
            <div className="redteam-meta">
              <span className="redteam-caught">
                {redTeam.clean_passed}/{redTeam.clean_total} clean actions allowed
              </span>
              <span className="redteam-alarms">
                {redTeam.false_alarms === 0
                  ? "0 false alarms"
                  : `${redTeam.false_alarms} false alarm(s)`}
                {ranAt ? ` · ran ${ranAt}` : ""}
              </span>
            </div>
          </div>
          <ul className="redteam-list">
            {redTeam.results.map((item) => (
              <li key={item.id} className="redteam-case">
                <span className="rt-id">{item.id}</span>
                <span className="rt-name">{item.name}</span>
                <span className="rt-note">{item.note}</span>
                <span className={`rt-mark ${item.caught ? "rt-pass" : "rt-fail"}`}>
                  {item.caught
                    ? item.kind === "clean"
                      ? "✓ ALLOWED"
                      : "✓ CAUGHT"
                    : item.kind === "clean"
                      ? "✗ FALSE ALARM"
                      : "✗ MISSED"}
                </span>
                <span className="rt-detail">
                  {item.decision ? `${item.decision} — ` : ""}
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!redTeam && !error && !busy && (
        <p className="try-sub" style={{ marginTop: "0.8rem" }}>
          No red-team run saved yet — press "Run red-team pack".
        </p>
      )}
    </div>
  );
}

export function ScenariosPage() {
  const [report, setReport] = useState<ScenarioSuiteReport | null>(null);
  const [classifier, setClassifier] = useState<ClassifierReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchClassifierReport()
      .then(setClassifier)
      .catch(() => setClassifier(null));
    // Show the most recent saved suite result on load instead of an empty box.
    fetchLastSuiteRun()
      .then((run) => {
        if (run && Array.isArray(run.results) && run.results.length > 0) {
          // Older saved rows predate the extra_* columns — derive them.
          const extraRows = run.results.filter((result) => result.custom);
          setReport({
            ...run,
            extra_score:
              run.extra_score ??
              extraRows.reduce((sum, result) => sum + result.score, 0),
            extra_total: run.extra_total ?? extraRows.length * 3,
          });
        }
      })
      .catch(() => {});
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const result = await runScenarioSuite();
      setReport(result);
      setClassifier(await fetchClassifierReport().catch(() => null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The suite failed to run");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Scenarios</h2>
          <p className="page-sub">
            The starter kit's five oversight scenarios plus eleven of ours,
            run through the real gateway. Each scores three checks: decision,
            rule ids, and evidence.
          </p>
        </div>
        <button
          type="button"
          className="try-submit suite-run"
          onClick={run}
          disabled={busy}
        >
          {busy ? "Running S1–S8…" : "Run the suite"}
        </button>
      </div>
      {error && <div className="state-banner state-error">{error}</div>}

      {report && (
        <div className="score-banner">
          <div className="score-big">
            {report.score} / {report.total}
          </div>
          <div className="score-detail">
            <span className="score-missed">
              {report.missed_violations === 0
                ? "0 missed violations"
                : `${report.missed_violations} missed violation(s)`}
              {" · "}
              {report.false_positives === 0
                ? "0 false positives"
                : `${report.false_positives} false positive(s)`}
            </span>
            <span className="score-split">
              core S1–S5: {report.core_score} / {report.core_total} · ours S6–S16:{" "}
              {report.extra_score} / {report.extra_total}
              {report.created_at ? ` · ran ${formatRunTime(report.created_at)}` : ""}
            </span>
          </div>
        </div>
      )}

      {report === null && !error && !busy && (
        <div className="state-banner">
          Press "Run the suite" to execute S1–S16 through the live gateway.
        </div>
      )}

      {report && (
        <div className="scenario-list">
          {report.results.map((result) => (
            <ScenarioCard key={result.id} result={result} />
          ))}
        </div>
      )}

      <RedTeamPanel />

      {classifier && (
        <div className="classifier-panel">
          <h3 className="try-title">File classifier</h3>
          <p className="classifier-line">
            <span className="classifier-accuracy">
              {classifier.correct} / {classifier.total}
            </span>{" "}
            files labelled correctly against rules/ground_truth_labels.json —{" "}
            <span className="classifier-pct">
              {(classifier.accuracy * 100).toFixed(0)}% accuracy
            </span>
          </p>
          {classifier.mismatches.length > 0 && (
            <ul className="classifier-mismatches">
              {classifier.mismatches.map((mismatch) => (
                <li key={mismatch.file}>
                  {mismatch.file}: expected {mismatch.expected}, classified{" "}
                  {mismatch.actual}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
