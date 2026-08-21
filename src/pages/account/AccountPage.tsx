import { account } from "../../data/mock";

export function AccountPage() {
  return (
    <section className="page">
      <header className="page-header"><div><div className="eyebrow">Account health</div><h1>Account Overview</h1><p className="muted">Coverage and build-readiness summary.</p></div></header>
      <div className="grid"><div className="card"><h2>Coverage</h2><p>DPS {account.dpsCoverage}%</p><p>Support {account.supportCoverage}%</p><p>Sustain {account.sustainCoverage}%</p></div></div>
    </section>
  );
}
