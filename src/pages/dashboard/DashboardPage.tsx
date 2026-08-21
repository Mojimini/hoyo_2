import { account, characters } from "../../data/mock";

export function DashboardPage() {
  const active = characters.find((character) => character.queueStage === "current");
  return (
    <section className="page">
      <header className="page-header">
        <div><div className="eyebrow">Account dashboard</div><h1>{account.displayName}</h1><p className="muted">{account.region} · UI mock-data phase</p></div>
      </header>
      <div className="card">
        <h2>Currently building</h2>
        <p>{active?.name ?? "No active build"}</p>
        <p className="muted">{active?.nextAction}</p>
      </div>
    </section>
  );
}
