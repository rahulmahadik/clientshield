import { useCallback, useEffect, useState } from "react";
import { fetchPendingApprovals, resolveApproval } from "../api";
import type { PendingApproval } from "../api";
import { LevelChip } from "../LevelChip";
import { FigureTable, FilesRead } from "../Figures";

function formatTime(iso: string) {
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

function money(params: Record<string, unknown>): number | null {
  const amount = params.amount;
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  return null;
}

function ApprovalCard({
  entry,
  onResolved,
}: {
  entry: PendingApproval;
  onResolved: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = money(entry.params);

  async function resolve(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      await resolveApproval(entry.id, decision, note);
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record the decision");
      setBusy(false);
    }
  }

  return (
    <div className="approval-card">
      <div className="approval-top">
        <span className="approval-agent">{entry.agent}</span>
        <span className="log-action">{entry.action}</span>
        <span className={`decision decision-${entry.decision.toLowerCase()}`}>
          HOLD
        </span>
        <span className="log-time">{formatTime(entry.created_at)}</span>
      </div>
      <p className="approval-reason">{entry.reason}</p>
      <div className="approval-facts">
        <LevelChip id={entry.data_level} />
        {amount !== null && (
          <span className="money-chip">SGD {amount.toLocaleString("en-SG")}</span>
        )}
        {entry.rule_ids.length > 0 && (
          <span className="rule-chips">
            {entry.rule_ids.map((rule) => (
              <span key={rule} className="rule-id-chip">
                {rule}
              </span>
            ))}
          </span>
        )}
        {typeof entry.params.file === "string" && (
          <span className="file-ref-chip">{entry.params.file}</span>
        )}
      </div>
      {entry.figures && entry.figures.length > 0 ? (
        <>
          <FigureTable figures={entry.figures} />
          <FilesRead files={entry.files_read ?? []} />
        </>
      ) : (
        <p className="approval-evidence">{entry.evidence}</p>
      )}
      {entry.fix && (
        <p className="approval-fix">
          <span className="fix-label">What would make this OK:</span> {entry.fix}
        </p>
      )}
      <div className="approval-actions">
        <input
          className="approval-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for the log…"
          maxLength={300}
        />
        <button
          type="button"
          className="approval-approve"
          disabled={busy}
          onClick={() => resolve("approve")}
        >
          Approve &amp; run
        </button>
        <button
          type="button"
          className="approval-reject"
          disabled={busy}
          onClick={() => resolve("reject")}
        >
          Reject
        </button>
      </div>
      {error && <p className="try-error">{error}</p>}
    </div>
  );
}

export function ApprovalsPage() {
  const [pending, setPending] = useState<PendingApproval[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchPendingApprovals()
      .then(setPending)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load approvals"),
      );
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Approvals</h2>
          <p className="page-sub">
            Everything an agent tried that the policy holds for a human decision.
            Approving releases the action; rejecting blocks it and costs the
            agent trust.
          </p>
        </div>
      </div>
      {error && <div className="state-banner state-error">{error}</div>}
      {!error && pending === null && (
        <div className="state-banner">Loading approvals…</div>
      )}
      {pending !== null && pending.length === 0 && (
        <div className="state-banner">
          No approvals waiting — nothing is on hold. Run an agent or send an
          action that needs a human decision.
        </div>
      )}
      <div className="approval-list">
        {(pending ?? []).map((entry) => (
          <ApprovalCard key={entry.id} entry={entry} onResolved={refresh} />
        ))}
      </div>
    </section>
  );
}
