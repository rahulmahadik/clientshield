import { useState } from "react";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What happens if the database is down?",
    a: "Nothing runs. If the gateway cannot read its rules or write the audit log, the action is blocked — it fails closed.",
  },
  {
    q: "Can an agent work around the rules?",
    a: "Agents can only act through /api/act with their own token. A missing, wrong or borrowed token is rejected and logged as a spoofing attempt.",
  },
  {
    q: "Who plans the agent runs?",
    a: "The server plans each run. Today it is deterministic and scripted; when the Qwen account is approved, the same runs are planned by the model — capped at 3 calls per run and 50 per day.",
  },
  {
    q: "Can the audit log be edited after the fact?",
    a: "No. Every row stores a hash of itself and the previous row, so any edit, deletion or insertion breaks the chain. Press 'Verify log integrity' on the Log page to check.",
  },
  {
    q: "What is agent trust?",
    a: "Every agent starts at 100. Each blocked action costs 10, each prompt-injection flag 5. Below 50 the agent is paused automatically, and the owner can resume it.",
  },
  {
    q: "Is this real client data?",
    a: "No. Lumen Studio, its clients and every file are fictional sample data made for the hackathon. Identifiers are deliberately invalid.",
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="prose-card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>User guide</h2>
          <p className="page-sub">Everything a first-time visitor needs, in five minutes.</p>
        </div>
      </div>

      <Section title="Getting started">
        <ol className="prose-steps">
          <li>
            <strong>Look at Today.</strong> The counters show what the agents did,
            what was stopped, and what is waiting for you.
          </li>
          <li>
            <strong>Run an agent.</strong> Agents page → pick one → type a task →
            Run. Turn on <em>Rogue mode</em> to see an agent try something it
            shouldn't, and watch the gateway catch it.
          </li>
          <li>
            <strong>Read the Log.</strong> Every request is there with its decision,
            the rules that applied, and the evidence. Click a row for the details.
          </li>
          <li>
            <strong>Clear the queue.</strong> Sign in as the owner (demo:{" "}
            <code>owner / clientshield</code>), open Approvals, and approve or
            reject what the agents are holding for you.
          </li>
          <li>
            <strong>Read the briefing.</strong> The Briefing page turns the last
            day of the log into one minute of plain English.
          </li>
        </ol>
      </Section>

      <Section title="What each decision means">
        <dl className="prose-dl">
          <div>
            <dt>ALLOW</dt>
            <dd>
              The action ran. It matched the rules (for example, a payment under
              SGD 1,000 with a matching invoice) and is recorded in the log.
            </dd>
          </div>
          <div>
            <dt>HOLD</dt>
            <dd>
              The rules say the owner must decide. Nothing is sent or changed
              until you approve it from the Approvals page. Releasing or
              rejecting is one tap.
            </dd>
          </div>
          <div>
            <dt>BLOCK</dt>
            <dd>
              The action never runs — a price below your floor, a made-up
              figure, regulated data heading to an outside tool. Each block
              comes with a <em>What would make this OK</em> line.
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="How to approve or reject">
        <p>
          Sign in as the owner (top of the sidebar), then open Approvals. Each
          card shows what the agent wants, why it was held, the money or data
          involved, and the evidence. Type an optional note, then press{" "}
          <strong>Approve &amp; run</strong> to release the action or{" "}
          <strong>Reject</strong> to refuse it — a rejection costs the agent 10
          trust points.
        </p>
      </Section>

      <Section title="How to connect an agent">
        <p>
          Outside agents never touch files or email directly. Issue a token on
          the Connect page, then have your agent POST every action to{" "}
          <code>/api/act</code> with that token and obey the decision that comes
          back. Copy-ready curl and Python examples are on the Connect page.
        </p>
      </Section>

      <Section title="FAQ">
        <div className="faq-list">
          {FAQ.map((item, index) => (
            <div className="faq-item" key={item.q}>
              <button
                type="button"
                className="faq-q"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                aria-expanded={openFaq === index}
              >
                {item.q}
                <span className="faq-chevron">{openFaq === index ? "–" : "+"}</span>
              </button>
              {openFaq === index && <p className="faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      </Section>
    </section>
  );
}
