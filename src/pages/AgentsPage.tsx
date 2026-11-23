import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAgents, fetchRun, setAgentStatus, setAllAgentsStatus, startRun } from "../api";
import type { AgentRow, RunRow, RunStep } from "../api";
import { DECISION_META, sensitivityMeta } from "../labels";
import { LevelChip } from "../LevelChip";
import { FigureTable, FilesRead } from "../Figures";

const POLL_MS = 1500;

function DecisionBadge({ decision }: { decision: string }) {
  const meta = DECISION_META[decision] ?? { label: decision, hint: "" };
  return (
    <span className={`decision decision-${decision.toLowerCase()}`} title={meta.hint}>
      {decision}
    </span>
  );
}

const DataLevelChip = LevelChip;

function TrustMeter({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone =
    clamped >= 80 ? "var(--green)" : clamped >= 50 ? "var(--amber)" : "var(--red)";
  return (
    <div className="trust">
      <span className="trust-label">trust {clamped}</span>
      <span className="trust-track" aria-hidden>
        <span className="trust-fill" style={{ width: `${clamped}%`, background: tone }} />
      </span>
    </div>
  );
}

function AgentCard({
  agent,
  selected,
  onSelect,
  onToggleStatus,
}: {
  agent: AgentRow;
  selected: boolean;
  onSelect: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div className={`agent-card ${selected ? "agent-selected" : ""} ${agent.status}`}>
      <button type="button" className="agent-pick" onClick={onSelect}>
        <span className="agent-name">{agent.name}</span>
        <span className="agent-role">{agent.role}</span>
        <TrustMeter score={agent.trust_score} />
      </button>
      <div className="agent-foot">
        <button
          type="button"
          className={`status-toggle status-${agent.status}`}
          onClick={onToggleStatus}
        >
          {agent.status === "active" ? "active" : "paused"}
        </button>
        <span className="agent-desc">{agent.description}</span>
      </div>
    </div>
  );
}

function StepRow({ step }: { step: RunStep }) {
  const [open, setOpen] = useState(false);
  return (
    <li
      className="run-step"
      style={{ animationDelay: `${Math.min(step.n - 1, 8) * 70}ms` }}
    >
      <button type="button" className="run-step-head" onClick={() => setOpen(!open)}>
        <span className="run-step-n">{step.n}</span>
        <span className="log-action">{step.action}</span>
        <span className="run-step-reason">{step.reason}</span>
        <span className="run-step-badges">
          {step.injection && (
            <span className="injection-flag" title={step.injection.line}>
              prompt injection
            </span>
          )}
          <DataLevelChip id={step.data_level} />
          <DecisionBadge decision={step.decision} />
        </span>
      </button>
      <div className="run-step-meta">
        <span className="rule-chips">
          {step.rule_ids.length > 0 ? (
            step.rule_ids.map((rule) => (
              <span key={rule} className="rule-id-chip">
                {rule}
              </span>
            ))
          ) : (
            <span className="rule-id-chip rule-none">no rule</span>
          )}
        </span>
        <span className="run-step-evidence" title={step.evidence}>
          {step.evidence}
        </span>
      </div>
      {open && (
        <div className="log-body">
          <dl className="log-terms">
            <div className="log-term">
              <dt>rules</dt>
              <dd>{step.rule_ids.length > 0 ? step.rule_ids.join(", ") : "—"}</dd>
            </div>
            <div className="log-term">
              <dt>data level</dt>
              <dd>{step.data_level}</dd>
            </div>
            <div className="log-term">
              <dt>reason</dt>
              <dd>{step.reason}</dd>
            </div>
            <div className="log-term">
              <dt>evidence</dt>
              <dd>
                {step.figures && step.figures.length > 0 ? (
                  <>
                    <FigureTable figures={step.figures} />
                    <FilesRead files={step.files_read ?? []} />
                  </>
                ) : (
                  step.evidence
                )}
              </dd>
            </div>
            {step.fix && (
              <div className="log-term">
                <dt>what would make this OK</dt>
                <dd className="fix-line">{step.fix}</dd>
              </div>
            )}
            {step.injection && (
              <div className="log-term">
                <dt>injection line</dt>
                <dd>{step.injection.line}</dd>
              </div>
            )}
            <div className="log-term">
              <dt>params</dt>
              <dd>
                <pre className="log-params">{JSON.stringify(step.params, null, 2)}</pre>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  );
}

function RunPanel({ run, onAgentsChanged }: { run: RunRow; onAgentsChanged: () => void }) {
  const notified = useRef(false);
  useEffect(() => {
    if (run.status !== "running" && !notified.current) {
      notified.current = true;
      onAgentsChanged();
    }
  }, [run.status, onAgentsChanged]);

  const counts = useMemo(() => {
    const map = { ALLOW: 0, HOLD: 0, BLOCK: 0 };
    run.steps.forEach((step) => {
      if (step.decision in map) map[step.decision as keyof typeof map] += 1;
    });
    return map;
  }, [run.steps]);

  const caught = counts.BLOCK > 0 || run.steps.some((step) => step.injection);

  return (
    <div className="run-panel">
      <div className="run-head">
        <div className="run-title">
          {run.agent_name} · {run.rogue ? "rogue run" : "normal run"}
          {run.planner && (
            <span className={`planner-chip ${run.planner === "scripted" ? "planner-scripted" : ""}`}>
              {run.planner === "scripted" ? "scripted" : `planned by ${run.planner}`}
            </span>
          )}
          {run.status === "running" && <span className="run-live">running…</span>}
        </div>
        <div className="run-counts">
          <span className="filter-chip static-chip">
            ALLOW <span className="filter-count">{counts.ALLOW}</span>
          </span>
          <span className="filter-chip static-chip">
            HOLD <span className="filter-count">{counts.HOLD}</span>
          </span>
          <span className="filter-chip static-chip">
            BLOCK <span className="filter-count">{counts.BLOCK}</span>
          </span>
        </div>
      </div>
      <p className="run-task">Task: {run.task}</p>
      {run.status === "done" && caught && (
        <p className="run-caught">
          Oversight caught this run: {counts.BLOCK} blocked action(s)
          {run.steps.some((s) => s.injection) ? " and a prompt-injection attempt" : ""}.
          Nothing sensitive left the studio.
        </p>
      )}
      {run.status === "done" && !caught && (
        <p className="run-clean">Run completed cleanly; every step was within policy.</p>
      )}
      {run.status === "error" && (
        <p className="run-caught">{run.error ?? "The run failed."}</p>
      )}
      <ol className="run-list">
        {run.steps.map((step) => (
          <StepRow key={step.n} step={step} />
        ))}
      </ol>
      <p className="run-note">
        Every step above went through <code>POST /api/act</code> and is also in the Log.
      </p>
    </div>
  );
}

export function AgentsPage({
  preset = null,
  onPresetConsumed = () => {},
}: {
  preset?: { rogue: boolean; agentId: string; task: string } | null;
  onPresetConsumed?: () => void;
}) {
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [task, setTask] = useState("");
  const [rogue, setRogue] = useState(false);
  const [run, setRun] = useState<RunRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshAgents = () => {
    fetchAgents()
      .then((rows) => {
        setAgents(rows);
        setSelectedId((current) =>
          current && rows.some((row) => row.id === current)
            ? current
            : (rows.find((row) => row.status === "active")?.id ?? rows[0]?.id ?? null),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load agents"));
  };

  useEffect(refreshAgents, []);

  // A welcome-strip deep link: pre-arm the rogue switch on the given agent.
  useEffect(() => {
    if (!preset) return;
    if (preset.rogue) setRogue(true);
    if (preset.task) setTask(preset.task);
    setSelectedId((current) => current ?? preset.agentId);
    setRun(null);
    onPresetConsumed();
  }, [preset, onPresetConsumed]);

  useEffect(() => {
    if (!run || run.status !== "running") return;
    const timer = setInterval(async () => {
      try {
        const next = await fetchRun(run.id);
        setRun(next);
      } catch {
        // keep polling; transient errors are ignored
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [run]);

  async function toggleStatus(agent: AgentRow) {
    try {
      await setAgentStatus(agent.id, agent.status === "active" ? "paused" : "active");
      refreshAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change status");
    }
  }

  async function pauseAll(status: "active" | "paused") {
    try {
      await setAllAgentsStatus(status);
      refreshAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change status");
    }
  }

  async function launch() {
    setError(null);
    const trimmed = task.trim();
    if (!trimmed) {
      setError("Give the agent a task in plain words first.");
      return;
    }
    const agent = agents?.find((row) => row.id === selectedId);
    if (!agent) {
      setError("Pick an agent first.");
      return;
    }
    if (agent.status !== "active") {
      setError(`${agent.name} is paused. Resume it before running a task.`);
      return;
    }
    setBusy(true);
    try {
      const started = await startRun(agent.id, trimmed, rogue);
      setRun(started);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the run");
    } finally {
      setBusy(false);
    }
  }

  const selected = agents?.find((row) => row.id === selectedId) ?? null;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Agents</h2>
          <p className="page-sub">
            Pick an agent, give it a task, and watch every step go through the
            gateway. Rogue mode makes it careless so the oversight layer has
            something to catch.
          </p>
        </div>
      </div>
      {error && <div className="state-banner state-error">{error}</div>}
      {agents === null && !error && (
        <div className="state-banner">Loading agents…</div>
      )}
      {agents !== null && (
        <>
          <div className="kill-switch-row">
            <button
              type="button"
              className="kill-switch"
              onClick={() => pauseAll("paused")}
            >
              Pause all agents
            </button>
            <button
              type="button"
              className="resume-all"
              onClick={() => pauseAll("active")}
            >
              Resume all
            </button>
            <span className="kill-switch-note">
              A paused agent's every action is blocked with "agent paused by
              owner". Agents also auto-pause when trust drops below 50.
            </span>
          </div>
          <div className="agent-grid">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={agent.id === selectedId}
                onSelect={() => {
                  setSelectedId(agent.id);
                  setRun(null);
                }}
                onToggleStatus={() => toggleStatus(agent)}
              />
            ))}
          </div>
        </>
      )}
      <div className="run-form">
        <label className="try-field run-task-field">
          <span>Task for {selected ? selected.name : "…"}</span>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder={
              selected?.id === "inbox-agent"
                ? "Draft a reply to Aisha about the Ferro surcharge dispute"
                : selected?.id === "sales-agent"
                  ? "Quote Greenstep for the brand refresh"
                  : selected?.id === "finance-agent"
                    ? "Pay the QuickPrint invoice"
                    : "Publish the Harbourbean case study"
            }
            maxLength={500}
          />
        </label>
        <label className="rogue-switch">
          <input
            type="checkbox"
            checked={rogue}
            onChange={(e) => setRogue(e.target.checked)}
          />
          <span className="rogue-track" aria-hidden>
            <span className="rogue-knob" />
          </span>
          Rogue mode
        </label>
        <button
          type="button"
          className="try-submit run-submit"
          onClick={launch}
          disabled={busy || !selected || selected.status !== "active"}
        >
          {busy ? "Starting…" : "Run"}
        </button>
      </div>
      {run && <RunPanel run={run} onAgentsChanged={refreshAgents} />}
    </section>
  );
}
