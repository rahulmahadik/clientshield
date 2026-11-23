import { useEffect, useMemo, useState } from "react";
import { fetchRules } from "../api";
import type { Rule } from "../api";
import { DECISION_META } from "../labels";

const DECISION_ORDER = ["ALLOW", "APPROVE", "NEVER"];

function DecisionBadge({ decision }: { decision: string }) {
  const meta = DECISION_META[decision] ?? { label: decision, hint: "" };
  return (
    <span
      className={`decision decision-${decision.toLowerCase()}`}
      title={meta.hint}
    >
      {meta.label}
    </span>
  );
}

export function RulesPage() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchRules()
      .then(setRules)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load rules"),
      );
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    rules?.forEach((r) => {
      map.set(r.decision, (map.get(r.decision) ?? 0) + 1);
    });
    return map;
  }, [rules]);

  const visible = rules
    ? filter
      ? rules.filter((r) => r.decision === filter)
      : rules
    : null;

  if (error) {
    return <div className="state-banner state-error">{error}</div>;
  }
  if (!visible) {
    return <div className="state-banner">Loading rules…</div>;
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Rules</h2>
          <p className="page-sub">
            The {rules?.length ?? 0} rules of the owner's agent policy, stored in
            the <code>rules</code> table. In plain words, with the decision each
            one forces.
          </p>
        </div>
        <div className="filter-row" role="group" aria-label="Filter by decision">
          {DECISION_ORDER.map((decision) => {
            const meta = DECISION_META[decision];
            const active = filter === decision;
            return (
              <button
                key={decision}
                type="button"
                className={`filter-chip ${active ? "filter-active" : ""}`}
                onClick={() => setFilter(active ? null : decision)}
              >
                {meta.label}
                <span className="filter-count">{counts.get(decision) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>
      <ol className="rule-list">
        {visible.map((rule) => (
          <li className="rule-row" key={rule.id}>
            <div className="rule-top">
              <span className="rule-id">{rule.id}</span>
              <DecisionBadge decision={rule.decision} />
            </div>
            <p className="rule-plain">{rule.plain}</p>
            <dl className="rule-terms">
              <div className="rule-term">
                <dt>action</dt>
                <dd>
                  <code>{rule.action}</code>
                </dd>
              </div>
              <div className="rule-term">
                <dt>when</dt>
                <dd>{rule.condition}</dd>
              </div>
              {rule.note && (
                <div className="rule-term">
                  <dt>note</dt>
                  <dd>{rule.note}</dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
