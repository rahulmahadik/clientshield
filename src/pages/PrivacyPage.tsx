export function PrivacyPage() {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Privacy</h2>
          <p className="page-sub">What this app stores, and how to remove it.</p>
        </div>
      </div>

      <section className="prose-card">
        <h3>What is stored</h3>
        <ul className="prose-list">
          <li>The demo business files (text, titles, sensitivity labels) — fictional sample data.</li>
          <li>The 19 rules, price floors and agent roster that drive the gateway.</li>
          <li>The action log: every request with its decision, rule ids, reason and evidence.</li>
          <li>Approvals you give, agent trust scores, and one briefing per day.</li>
        </ul>
      </section>

      <section className="prose-card">
        <h3>Your agent content stays in your database</h3>
        <p>
          Everything above lives in this app's own attached database — not in
          anyone else's storage. The only outbound calls the app can make are
          to the Qwen API, and only when you press Run or Generate briefing;
          otherwise the app works fully offline from its own rules and files.
        </p>
      </section>

      <section className="prose-card">
        <h3>Tokens are hashed, never stored in clear</h3>
        <p>
          Agent tokens are shown once when you issue them, then stored only as
          a SHA-256 hash. Nobody — including this app's operator — can read
          them back.
        </p>
      </section>

      <section className="prose-card">
        <h3>No data is sold or shared</h3>
        <p>
          There is no analytics, no advertising and no third-party tracking on
          this site. Nothing you do here is sent anywhere else.
        </p>
      </section>

      <section className="prose-card">
        <h3>How to delete it</h3>
        <ul className="prose-list">
          <li>
            <strong>The action log and approvals:</strong> sign in as the owner
            and press "Clear test log" (Log page) or "Reset demo day" (Today).
          </li>
          <li>
            <strong>Everything:</strong> delete the page — its database is
            deleted with it. In this demo, ask the owner to remove the
            ClientShield page from their QwenWork account.
          </li>
        </ul>
      </section>
    </section>
  );
}
