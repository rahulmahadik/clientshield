export function AboutPage() {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>About</h2>
          <p className="page-sub">
            A gatekeeper for the AI agents of a one-person company.
          </p>
        </div>
      </div>

      <section className="prose-card">
        <h3>What ClientShield is</h3>
        <p>
          Four AI agents answer Mei's email, write her quotes, pay her suppliers
          and publish her work. ClientShield sits between them and the world:
          every action goes through one gateway that checks it against 19
          written rules, the evidence in the files, and the owner's price
          floors — before it happens.
        </p>
        <p>
          What the rules alone can't decide, a human does: holds queue up as
          one-tap approvals. Everything the agents try is written to a
          tamper-evident log, and each morning the owner gets a one-minute
          briefing of what happened.
        </p>
      </section>

      <section className="prose-card">
        <h3>Who it's for</h3>
        <p>
          One-person companies and small teams who want agents to do real work
          — email, quotes, payments, publishing — without giving them the keys.
          If an agent can act, something has to check it first.
        </p>
      </section>

      <section className="prose-card">
        <h3>Why</h3>
        <p>
          Agents are fast, tireless, and confidently wrong. The failure modes
          are specific: quoting below your floor, inventing a number, pasting a
          client list into a tool, obeying an instruction hidden in an email.
          ClientShield is built around exactly those moments — rules in code,
          figures checked against files the agent actually read, instructions
          treated as data, and a kill switch when trust runs out.
        </p>
        <p>
          This site is a working demo: Lumen Studio and all its files are
          fictional sample data, and the whole app — gateway, database,
          oversight, briefing — was built and published in QwenWork.
        </p>
      </section>
    </section>
  );
}
