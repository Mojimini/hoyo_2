import { characters, teams } from "../../data/mock";

export function TeamsPage() {
  return (
    <section className="page">
      <header className="page-header"><div><div className="eyebrow">Team readiness</div><h1>Teams</h1><p className="muted">See team bottlenecks before spending more resources.</p></div></header>
      <div className="grid">{teams.map((team) => <article className="card" key={team.id}><h2>{team.name}</h2><p>{team.characterIds.map((id) => characters.find((c) => c.id === id)?.name).join(" · ")}</p><p className="muted">Readiness {team.readiness}% · {team.recommendation}</p></article>)}</div>
    </section>
  );
}
