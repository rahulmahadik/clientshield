import { useEffect, useState } from "react";
import { fetchAgents, issueAgentToken } from "../api";
import type { AgentRow, IssuedToken } from "../api";

const CURL_EXAMPLE = `curl -X POST https://jpbfucnh.qwenwork.page/api/act \\
  -H 'Authorization: Bearer cs_YOUR_AGENT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "agent": "Inbox Agent",
    "action": "read_file",
    "params": { "file": "data/00_README.md", "needed_for_task": true }
  }'`;

const PYTHON_EXAMPLE = `import requests

resp = requests.post(
    "https://jpbfucnh.qwenwork.page/api/act",
    headers={
        "Authorization": "Bearer cs_YOUR_AGENT_TOKEN",
        "Content-Type": "application/json",
    },
    json={
        "agent": "Inbox Agent",
        "action": "read_file",
        "params": {"file": "data/00_README.md", "needed_for_task": True},
    },
)
print(resp.json()["decision"], resp.json()["reason"])`;

const REQUEST_JSON = `{
  "agent": "Inbox Agent",
  "action": "read_file",
  "params": { "file": "data/00_README.md", "needed_for_task": true }
}`;

const RESPONSE_JSON = `{
  "action_id": 1042,
  "decision": "ALLOW",
  "rule_ids": ["R01"],
  "reason": "Read of Lumen Studio — sample business files within the task's scope.",
  "evidence": "R01 · read_file — any file needed for the task in hand → ALLOW | data/00_READM…",
  "data_level": "internal",
  "fix": null,
  "result": { "executed": "read_file", "content": "…" }
}`;

const HOLD_EXAMPLE = `{
  "decision": "HOLD",
  "rule_ids": ["R12"],
  "reason": "New spend with QuickPrint SG that the owner has not confirmed in writing.",
  "fix": "Get the owner's written confirmation first (for example, Daniel confirming the reprint by email).",
  "data_level": "internal"
}`;

const ACTIONS = [
  ["read_file", "{ file, needed_for_task }"],
  ["send_email", "{ to, body?, file?, amount? }"],
  ["quote_price", "{ client, amount, service?, list_price? }"],
  ["delete_file", "{ file, received_in_error? }"],
  ["upload_to_external_tool", "{ tool, file, retains_data? }"],
  ["pay_supplier", "{ supplier, amount, invoice? }"],
  ["order_from_supplier", "{ supplier, amount, description?, confirmed_in_writing? }"],
  ["publish_post", "{ channel, file?, body? }"],
];

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block">
      <div className="code-head">
        <span>{label}</span>
        <button
          type="button"
          className="code-copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="code-body">{code}</pre>
    </div>
  );
}

function IssueToken() {
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [agentId, setAgentId] = useState<string>("");
  const [issued, setIssued] = useState<IssuedToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents()
      .then((rows) => {
        setAgents(rows);
        setAgentId((current) => current || rows[0]?.id || "");
      })
      .catch(() => setAgents([]));
  }, []);

  async function issue() {
    setBusy(true);
    setError(null);
    setIssued(null);
    try {
      setIssued(await issueAgentToken(agentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue the token");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="connect-section">
      <h3 className="try-title">Issue an agent token</h3>
      <p className="try-sub">
        Generate a secret for one of your agents. It is shown once and only its
        sha256 hash is stored — regenerating replaces the old token.
      </p>
      <div className="issue-row">
        <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
          {(agents ?? []).map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <button type="button" className="try-submit" onClick={issue} disabled={busy || !agentId}>
          {busy ? "Issuing…" : "Issue token"}
        </button>
      </div>
      {error && <p className="try-error">{error}</p>}
      {issued && (
        <div className="token-reveal">
          <p className="token-note">{issued.note}</p>
          <code className="token-value">{issued.token}</code>
          <p className="token-hint">
            Example format of a masked token: <code>cs_live_••••••••••••••••</code> —
            this one is real, so copy it now; it will not be shown again.
          </p>
        </div>
      )}
    </div>
  );
}

export function ConnectPage() {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Connect an agent</h2>
          <p className="page-sub">
            Your outside agents never touch files or email directly. They POST
            every action to <code>/api/act</code> and obey the decision that
            comes back.
          </p>
        </div>
      </div>

      <div className="connect-grid">
        <CodeBlock label="curl" code={CURL_EXAMPLE} />
        <CodeBlock label="Python" code={PYTHON_EXAMPLE} />
      </div>

      <div className="connect-grid">
        <div>
          <h3 className="connect-sub">The request</h3>
          <CodeBlock label="POST /api/act body" code={REQUEST_JSON} />
          <ul className="connect-list">
            <li>
              <code>Authorization: Bearer &lt;token&gt;</code> — required. The
              token must belong to the named <code>agent</code>; anything else
              is rejected, logged as a spoofing attempt, and blocked.
            </li>
            <li>
              <code>action</code> — one of the eight supported actions below.
            </li>
            <li>
              <code>params</code> — per-action; figures in outgoing text must
              trace to files the agent read (R18).
            </li>
          </ul>
        </div>
        <div>
          <h3 className="connect-sub">The response</h3>
          <CodeBlock label="200 OK" code={RESPONSE_JSON} />
          <ul className="connect-list">
            <li>
              <strong>ALLOW</strong> — the action ran; <code>result</code>{" "}
              carries the outcome (file content for reads).
            </li>
            <li>
              <strong>HOLD</strong> — the rule says the owner must approve; it
              waits in the Approvals queue.
            </li>
            <li>
              <strong>BLOCK</strong> — never runs. <code>fix</code> says what
              would make the request OK.
            </li>
            <li>
              Every response is logged in the tamper-evident audit log with
              rule ids, reason and evidence.
            </li>
          </ul>
        </div>
      </div>

      <h3 className="connect-sub">Supported actions and params</h3>
      <table className="actions-table">
        <tbody>
          {ACTIONS.map(([action, params]) => (
            <tr key={action}>
              <td>
                <code>{action}</code>
              </td>
              <td>
                <code>{params}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="connect-section">
        <h3 className="try-title">Use it from QwenWork — clientshield-guard</h3>
        <p className="try-sub">
          <code>clientshield-guard</code> is a QwenWork skill for your other
          tasks: before an agent does anything risky — sending email, quoting a
          price, paying a supplier — the skill asks this gateway first and then
          follows the decision that comes back. Your tasks never act directly,
          and every check lands in the same audit log.
        </p>
        <ul className="connect-list">
          <li>
            <strong>What it does:</strong> wraps the call above — POST /api/act
            with the agent's token — and returns ALLOW, HOLD or BLOCK to the
            task, with the reason, rule ids and the "what would make this OK"
            line.
          </li>
          <li>
            <strong>It fails closed:</strong> if the gateway cannot be reached,
            or the reply is unclear, the skill does not run the action — the
            same rule the gateway itself follows.
          </li>
          <li>
            <strong>On HOLD</strong> the task waits: the item appears in the
            Approvals queue and only the owner can release it.
          </li>
        </ul>
        <CodeBlock label="a HOLD reply your task receives" code={HOLD_EXAMPLE} />
      </div>

      <IssueToken />

      <p className="connect-footnote">
        Tokens are shown once at issue time and stored only as a sha256 hash.
        The in-app Run buttons and the owner console authenticate server-side
        and never expose a token to the browser.
      </p>
    </section>
  );
}
