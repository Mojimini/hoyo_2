import { characters } from "../../data/mock";

export function PlannerPage() {
  const stages = ["current", "next", "later", "done"] as const;
  return (
    <section className="page">
      <header className="page-header"><div><div className="eyebrow">Build queue</div><h1>Build Planner</h1><p className="muted">Current → Next → Later → Done</p></div></header>
      <div className="grid">
        {stages.map((stage) => <div className="card" key={stage}><h2>{stage}</h2>{characters.filter((c) => c.queueStage === stage).map((c) => <p key={c.id}>{c.name}</p>)}</div>)}
      </div>
    </section>
  );
}
