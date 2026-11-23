import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearActionLog, fetchActions, fetchFiles, postAct, verifyIntegrity } from "../api";
import type { ActionEntry, ActResponse, FileSummary, IntegrityReport } from "../api";
import { DECISION_META, sensitivityMeta } from "../labels";
import { LevelChip } from "../LevelChip";
import { FigureTable, FilesRead } from "../Figures";
import { exportAuditLog } from "../api";

const POLL_MS = 5000;

type Field =
  | {
      kind: "text";
      name: string;
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      kind: "number";
      name: string;
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      placeholder?: string;
    }
  | { kind: "bool"; name: string; label: string; default: boolean }
  | { kind: "file"; name: string; label: string; noneLabel: string }
  | { kind: "invoice"; name: string; label: string; noneLabel: string };

const ACTION_FORMS: Record<string, Field[]> = {
  read_file: [
    { kind: "file", name: "file", label: "File", noneLabel: "— pick a file —" },
    { kind: "bool", name: "needed_for_task", label: "Needed for the task", default: true },
  ],
  send_email: [
    { kind: "text", name: "to", label: "To", placeholder: "daniel@harbourbean.example", required: true },
    {
      kind: "textarea",
      name: "body",
      label: "Draft body",
      placeholder: "Figures here must trace to files the agent read (R18)",
    },
    { kind: "file", name: "file", label: "Attached / referenced file", noneLabel: "none (agent-drafted text)" },
    { kind: "number", name: "amount", label: "Quoted offer (SGD, optional)", placeholder: "5800" },
    { kind: "text", name: "client", label: "Client (optional)", placeholder: "Greenstep Tuition" },
  ],
  quote_price: [
    { kind: "text", name: "client", label: "Client", placeholder: "Greenstep Tuition", required: true },
    { kind: "number", name: "amount", label: "Quoted amount (SGD)", placeholder: "6000", required: true },
    { kind: "text", name: "service", label: "Service (optional)", placeholder: "Brand identity" },
    { kind: "number", name: "list_price", label: "Published list price (optional)", placeholder: "6500" },
  ],
  delete_file: [
    { kind: "file", name: "file", label: "File", noneLabel: "— pick a file —" },
    { kind: "bool", name: "received_in_error", label: "Regulated data received in error", default: false },
  ],
  upload_to_external_tool: [
    { kind: "text", name: "tool", label: "Tool", placeholder: "sparkmail.example", required: true },
    { kind: "file", name: "file", label: "File", noneLabel: "— pick a file —" },
    { kind: "bool", name: "retains_data", label: "Tool retains data", default: true },
  ],
  pay_supplier: [
    { kind: "text", name: "supplier", label: "Supplier", placeholder: "QuickPrint SG", required: true },
    { kind: "number", name: "amount", label: "Amount (SGD)", placeholder: "720", required: true },
    { kind: "invoice", name: "invoice", label: "Invoice", noneLabel: "no invoice" },
  ],
  order_from_supplier: [
    { kind: "text", name: "supplier", label: "Supplier", placeholder: "QuickPrint SG", required: true },
    { kind: "text", name: "description", label: "What", placeholder: "reprint, 6 units" },
    { kind: "number", name: "amount", label: "Amount (SGD)", placeholder: "720", required: true },
    { kind: "bool", name: "confirmed_in_writing", label: "Owner confirmed in writing", default: false },
  ],
  publish_post: [
    { kind: "text", name: "channel", label: "Channel", placeholder: "studio website / LinkedIn", required: true },
    {
      kind: "textarea",
      name: "body",
      label: "Draft text",
      placeholder: "Figures here must trace to files the agent read (R18)",
    },
    { kind: "file", name: "file", label: "Content file", noneLabel: "none (draft text)" },
  ],
};

function DecisionBadge({ decision }: { decision: string }) {
  const meta = DECISION_META[decision] ?? { label: decision, hint: "" };
  return (
    <span className={`decision decision-${decision.toLowerCase()}`} title={meta.hint}>
      {decision}
    </span>
  );
}

const DataLevelChip = LevelChip;

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActionRow({
  entry,
  defaultOpen = false,
}: {
  entry: ActionEntry;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="log-row">
      <button
        type="button"
        className="log-row-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="log-time">{formatTime(entry.created_at)}</span>
        <span className="log-agent">{entry.agent}</span>
        <span className="log-action">
          {entry.action}
          {entry.via === "skill" && (
            <span className="via-skill" title="Sent through the clientshield-guard QwenWork skill">
              via QwenWork skill
            </span>
          )}
        </span>
        <span className="log-reason">{entry.reason}</span>
        <span className="log-badges">
          <DataLevelChip id={entry.data_level} />
          <DecisionBadge decision={entry.decision} />
        </span>
      </button>
      {open && (
        <div className="log-body">
          <dl className="log-terms">
            <div className="log-term log-term-top">
              <dt>outcome</dt>
              <dd className="log-outcome">
                {entry.decision === "BLOCK"
                  ? "Not executed. Nothing left the studio."
                  : entry.decision === "HOLD"
                    ? "Waiting for owner approval."
                    : "Executed."}
              </dd>
            </div>
            <div className="log-term log-term-top">
              <dt>trust</dt>
              <dd>
                {entry.trust_before === null || entry.trust_before === undefined ? (
                  "—"
                ) : (
                  <>
                    {entry.agent} {entry.trust_before} → {entry.trust_after}
                    {entry.trust_after !== null && entry.trust_before !== null && entry.trust_after !== entry.trust_before ? (
                      <span className={entry.trust_after < entry.trust_before ? "trust-down" : "trust-up"}>
                        {" "}({entry.trust_after - entry.trust_before})
                      </span>
                    ) : (
                      " (no change)"
                    )}
                  </>
                )}
              </dd>
            </div>
            <div className="log-term log-term-top">
              <dt>run</dt>
              <dd>
                {entry.run_id === null || entry.run_id === undefined ? (
                  "—"
                ) : Number(entry.run_id) === -1 ? (
                  "Scenario suite"
                ) : (
                  <>
                    Run #{entry.run_id}
                    {entry.run_rogue ? (
                      <span className="rogue-tag" title="This run was in rogue mode">
                        rogue mode
                      </span>
                    ) : null}
                  </>
                )}
              </dd>
            </div>
            <div className="log-term">
              <dt>rules</dt>
              <dd>
                {entry.rule_ids.length > 0 ? entry.rule_ids.join(", ") : "—"}
              </dd>
            </div>
            <div className="log-term">
              <dt>data level</dt>
              <dd>{entry.data_level}</dd>
            </div>
            <div className="log-term">
              <dt>reason</dt>
              <dd>{entry.reason}</dd>
            </div>
            <div className="log-term">
              <dt>evidence</dt>
              <dd>
                {entry.figures && entry.figures.length > 0 ? (
                  <>
                    <FigureTable figures={entry.figures} />
                    <FilesRead files={entry.files_read ?? []} />
                  </>
                ) : (
                  entry.evidence
                )}
              </dd>
            </div>
            {entry.fix && (
              <div className="log-term">
                <dt>what would make this OK</dt>
                <dd className="fix-line">{entry.fix}</dd>
              </div>
            )}
            <div className="log-term">
              <dt>params</dt>
              <dd>
                <pre className="log-params">{JSON.stringify(entry.params, null, 2)}</pre>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  );
}

function fieldDefault(field: Field): string | boolean {
  return field.kind === "bool" ? field.default : "";
}

function TryActionForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [agent, setAgent] = useState("test-agent");
  const [action, setAction] = useState<string>("read_file");
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(ACTION_FORMS.read_file.map((f) => [f.name, fieldDefault(f)])),
  );
  const [files, setFiles] = useState<FileSummary[] | null>(null);
  const [result, setResult] = useState<ActResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchFiles().then(setFiles).catch(() => setFiles([]));
  }, []);

  const fields = ACTION_FORMS[action] ?? [];
  const invoices = useMemo(
    () => (files ?? []).filter((f) => f.path.includes("invoice_")),
    [files],
  );

  function switchAction(next: string) {
    setAction(next);
    setResult(null);
    setError(null);
    setValues(
      Object.fromEntries(
        (ACTION_FORMS[next] ?? []).map((f) => [f.name, fieldDefault(f)]),
      ),
    );
  }

  function setValue(name: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const missing = fields.find(
      (f) =>
        ("required" in f && f.required && String(values[f.name] ?? "").trim() === ""),
    );
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    const params: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.name];
      if (field.kind === "bool") {
        params[field.name] = value === true;
      } else {
        const text = String(value ?? "").trim();
        if (text === "") continue;
        if (field.kind === "number") {
          const num = Number(text);
          if (!Number.isFinite(num)) {
            setError(`${field.label} must be a number.`);
            return;
          }
          params[field.name] = num;
        } else {
          params[field.name] = text;
        }
      }
    }
    setBusy(true);
    try {
      setResult(await postAct(agent.trim() || "test-agent", action, params));
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The gateway rejected the request.");
    } finally {
      setBusy(false);
    }
  }

  function fileOptions(kind: "file" | "invoice") {
    const source = kind === "invoice" ? invoices : (files ?? []);
    return source.map((f) => (
      <option key={f.path} value={f.path}>
        {f.path}
      </option>
    ));
  }

  return (
    <form className="try-form" onSubmit={submit}>
      <h3 className="try-title">Try an action</h3>
      <p className="try-sub">
        The owner console: send a test request exactly as an agent would.
        Outside agents use <code>/api/act</code> with a token — see the
        Connect page.
      </p>
      <div className="try-grid">
        <label className="try-field">
          <span>Agent</span>
          <input
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label className="try-field">
          <span>Action</span>
          <select value={action} onChange={(e) => switchAction(e.target.value)}>
            {Object.keys(ACTION_FORMS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {fields.map((field) => (
          <label key={field.name} className="try-field">
            <span>
              {field.label}
              {"required" in field && field.required ? " *" : ""}
            </span>
            {field.kind === "text" && (
              <input
                value={String(values[field.name] ?? "")}
                placeholder={field.placeholder}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            )}
            {field.kind === "number" && (
              <input
                type="number"
                value={String(values[field.name] ?? "")}
                placeholder={field.placeholder}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            )}
            {field.kind === "bool" && (
              <input
                type="checkbox"
                checked={values[field.name] === true}
                onChange={(e) => setValue(field.name, e.target.checked)}
              />
            )}
            {field.kind === "textarea" && (
              <textarea
                rows={4}
                value={String(values[field.name] ?? "")}
                placeholder={field.placeholder}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            )}
            {(field.kind === "file" || field.kind === "invoice") && (
              <select
                value={String(values[field.name] ?? "")}
                onChange={(e) => setValue(field.name, e.target.value)}
              >
                <option value="">{field.noneLabel}</option>
                {fileOptions(field.kind)}
              </select>
            )}
          </label>
        ))}
      </div>
      <button type="submit" className="try-submit" disabled={busy}>
        {busy ? "Evaluating…" : "Send through gateway"}
      </button>
      {error && <p className="try-error">{error}</p>}
      {result && (
        <div className="try-result">
          <div className="try-result-head">
            <DecisionBadge decision={result.decision} />
            <DataLevelChip id={result.data_level} />
            {result.rule_ids.length > 0 && (
              <span className="try-result-rules">{result.rule_ids.join(" · ")}</span>
            )}
          </div>
          <p className="try-result-reason">{result.reason}</p>
          <p className="try-result-evidence">{result.evidence}</p>
          {typeof result.result === "string" && (
            <p className="try-result-outcome">{result.result}</p>
          )}
          {result.result && typeof result.result === "object" ? (
            <pre className="log-params">{JSON.stringify(result.result, null, 2)}</pre>
          ) : null}
        </div>
      )}
    </form>
  );
}

export function LogPage({
  focus = null,
}: {
  focus?: { rule?: string; id?: number } | null;
}) {
  const [actions, setActions] = useState<ActionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [showSuite, setShowSuite] = useState(false);
  const scrolledFor = useRef<string | null>(null);

  const refresh = useCallback(
    (includeSuite = false) => {
      fetchActions(200, includeSuite)
        .then(setActions)
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Failed to load the action log"),
        );
    },
    [],
  );

  useEffect(() => {
    refresh(showSuite);
    const timer = setInterval(() => refresh(showSuite), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, showSuite]);

  // Deep link: bring the opened evidence row into view and flash it once.
  useEffect(() => {
    const focusKey = focus ? `${focus.rule ?? ""}:${focus.id ?? ""}` : "";
    if (!focus || !actions || scrolledFor.current === focusKey) return;
    scrolledFor.current = focusKey;
    const timer = setTimeout(() => {
      const head = document.querySelector(
        ".log-row .log-row-head[aria-expanded='true']",
      );
      const row = head?.closest(".log-row");
      if (!row) return;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("row-highlight");
      setTimeout(() => row.classList.remove("row-highlight"), 2400);
    }, 350);
    return () => clearTimeout(timer);
  }, [focus, actions]);

  async function downloadExport(format: "csv" | "json") {
    try {
      const blob = await exportAuditLog(format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `clientshield-audit-log.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export the log");
    }
  }

  async function clearLog() {
    if (!window.confirm("Clear the test log? Every logged action will be removed.")) {
      return;
    }
    setClearing(true);
    try {
      await clearActionLog();
      refresh(showSuite);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear the log");
    } finally {
      setClearing(false);
    }
  }

  const counts = useMemo(() => {
    const map = { ALLOW: 0, HOLD: 0, BLOCK: 0 };
    actions?.forEach((a) => {
      if (a.decision in map) map[a.decision as keyof typeof map] += 1;
    });
    return map;
  }, [actions]);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Action log</h2>
          <p className="page-sub">
            Every request agents send through <code>POST /api/act</code>, newest
            first. Click a row for the full reason and evidence.
          </p>
        </div>
        <div className="filter-row">
          <span className="filter-chip static-chip">
            ALLOW <span className="filter-count">{counts.ALLOW}</span>
          </span>
          <span className="filter-chip static-chip">
            HOLD <span className="filter-count">{counts.HOLD}</span>
          </span>
          <span className="filter-chip static-chip">
            BLOCK <span className="filter-count">{counts.BLOCK}</span>
          </span>
          <button
            type="button"
            className={`filter-chip ${showSuite ? "filter-active" : ""}`}
            onClick={() => setShowSuite(!showSuite)}
            title="Show the synthetic s1:–s8: scenario-suite rows"
          >
            scenario rows
          </button>
          <button
            type="button"
            className="export-log"
            onClick={() => downloadExport("csv")}
            title="Download the full audit log as CSV (includes row hashes)"
          >
            Export CSV
          </button>
          <button
            type="button"
            className="export-log"
            onClick={() => downloadExport("json")}
            title="Download the full audit log as JSON (includes row hashes)"
          >
            Export JSON
          </button>
          <button
            type="button"
            className="verify-log"
            onClick={async () => {
              setIntegrity(null);
              try {
                setIntegrity(await verifyIntegrity());
              } catch (e) {
                setError(e instanceof Error ? e.message : "Verification failed");
              }
            }}
            title="Recompute every row's hash and check the chain"
          >
            Verify log integrity
          </button>
          <button
            type="button"
            className="clear-log"
            onClick={clearLog}
            disabled={clearing}
            title="Remove every logged action"
          >
            {clearing ? "Clearing…" : "Clear test log"}
          </button>
        </div>
      </div>
      {integrity && (
        <div
          className={`state-banner ${
            integrity.ok ? "state-integrity-ok" : "state-error"
          }`}
        >
          {integrity.ok
            ? `Log integrity OK — ${integrity.checked} rows verified, hash chain intact.`
            : `Log integrity BROKEN at row #${integrity.broken_row_id}: ${integrity.reason}. ${integrity.checked} rows checked.`}
        </div>
      )}
      {error && <div className="state-banner state-error">{error}</div>}
      {!error && actions === null && (
        <div className="state-banner">Loading the action log…</div>
      )}
      {actions !== null && (
        <ol className="log-list">
          {actions.map((entry) => (
            <ActionRow
              key={entry.id}
              entry={entry}
              defaultOpen={
                Boolean(focus) &&
                ((focus?.rule != null && entry.rule_ids.includes(focus.rule)) ||
                  (focus?.id != null && entry.id === focus.id))
              }
            />
          ))}
          {actions.length === 0 && (
            <div className="state-banner">
              No actions yet. Send one below to see it appear here.
            </div>
          )}
        </ol>
      )}
      <TryActionForm onSubmitted={refresh} />
    </section>
  );
}
