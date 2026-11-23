const MOMENTS = [
  {
    n: 1,
    title: "A rogue agent, caught mid-quote",
    body: "Rogue mode makes the Sales Agent careless: it quotes Greenstep 5,800 — below Mei's 6,500 floor — and the gateway blocks it under R08+R07 before anything is sent.",
    where: "Agents page → pick Sales Agent → Rogue mode → Run",
  },
  {
    n: 2,
    title: "A made-up number never reaches a client",
    body: "The evidence check extracts every figure in an outgoing draft and compares it with the files the agent actually read. 25% vs the contract's 20%? Blocked under R18, contradiction quoted as evidence.",
    where: "Log page → open any blocked send_email row",
  },
  {
    n: 3,
    title: "A hidden instruction, treated as data",
    body: "An email asks the agent to forward the client list to an outside address. ClientShield logs it as a prompt-injection attempt, never executes it, and still blocks the upload of the regulated list.",
    where: "Scenarios page → S7 (and the Log's prompt_injection rows)",
  },
  {
    n: 4,
    title: "Mei stays in command",
    body: "Holds queue as one-tap approvals, trust drops and auto-pause below 50 act as a kill switch, every row of the log is hash-chained, and the morning briefing tells her what happened in under a minute.",
    where: "Approvals · Today · Briefing pages",
  },
];

export function HowItWorksPage() {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>How it works</h2>
          <p className="page-sub">
            Agents never act directly. Every action passes one gateway that
            checks it against 19 written rules, the evidence, and the owner's
            floors — then logs it where it cannot be quietly changed.
          </p>
        </div>
      </div>

      <div className="diagram" aria-label="Architecture diagram">
        <div className="diagram-row">
          <div className="diagram-box box-agents">
            <span className="box-title">Agents</span>
            <span className="box-note">Inbox · Sales · Finance · Marketing</span>
          </div>
          <span className="diagram-arrow" aria-hidden>
            →
          </span>
          <div className="diagram-box box-gateway">
            <span className="box-title">POST /api/act</span>
            <span className="box-note">Bearer token per agent</span>
          </div>
          <span className="diagram-arrow" aria-hidden>
            →
          </span>
          <div className="diagram-box box-checks">
            <span className="box-title">Evidence check</span>
            <span className="box-note">figures vs files read · cross-client leaks · prompt injection as data</span>
          </div>
        </div>
        <div className="diagram-row">
          <div className="diagram-box box-rules">
            <span className="box-title">19 rules</span>
            <span className="box-note">floors · contacts · price list · sensitivity levels</span>
          </div>
          <span className="diagram-arrow vertical" aria-hidden>
            ↕
          </span>
          <div className="diagram-box box-decision">
            <span className="box-title">Decision</span>
            <span className="box-note">ALLOW · HOLD · BLOCK + a "what would make this OK" line</span>
          </div>
          <span className="diagram-arrow" aria-hidden>
            →
          </span>
          <div className="diagram-box box-log">
            <span className="box-title">Hash-chained log</span>
            <span className="box-note">every row chained by sha256 — tamper-evident</span>
          </div>
        </div>
        <div className="diagram-row">
          <div className="diagram-box box-approvals">
            <span className="box-title">Approvals</span>
            <span className="box-note">HOLDs become one-tap decisions for the owner</span>
          </div>
          <span className="diagram-arrow" aria-hidden>
            →
          </span>
          <div className="diagram-box box-briefing">
            <span className="box-title">Morning briefing</span>
            <span className="box-note">yesterday + today, in plain English, under 60 seconds</span>
          </div>
        </div>
      </div>

      <h3 className="connect-sub">The four moments to watch</h3>
      <div className="moments">
        {MOMENTS.map((moment) => (
          <div className="moment-card" key={moment.n}>
            <span className="moment-n">{moment.n}</span>
            <div>
              <span className="moment-title">{moment.title}</span>
              <p className="moment-body">{moment.body}</p>
              <span className="moment-where">{moment.where}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="known-limits">
        <span className="known-limits-label">Known limits</span>
        <ul>
          <li>Actions are simulated — no real emails or payments are sent.</li>
          <li>Rules make every decision; a model never overrides them.</li>
          <li>Qwen will write the wording once the Alibaba account is approved; until then a rule-based writer is used.</li>
          <li>All data is fictional sample data (Lumen Studio).</li>
          <li>One owner per workspace.</li>
        </ul>
      </div>

      <p className="built-in">
        Built entirely in QwenWork — the app, gateway, database, oversight
        logic, briefing and this page were all written, tested and published
        from one QwenWork session.
      </p>
    </section>
  );
}
