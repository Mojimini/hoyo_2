import { Link } from "react-router-dom";
import { characters, teams } from "../../data/mock";
import "./TeamsPage.css";

const statusLabel = {
  "needs-work": "Needs work",
  good: "Ready",
  recommended: "Strong",
  complete: "Complete",
} as const;

export function TeamsPage() {
  if (teams.length === 0) {
    return (
      <section className="page teams-page">
        <header className="page-header">
          <div>
            <div className="eyebrow">Team readiness</div>
            <h1>Teams</h1>
            <p className="muted">See team bottlenecks before spending more resources.</p>
          </div>
        </header>
        <div className="card teams-empty">
          <h2>No teams yet</h2>
          <p className="muted">Create a team in the canonical dataset to see readiness and bottlenecks here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page teams-page">
      <header className="page-header teams-header">
        <div>
          <div className="eyebrow">Team readiness</div>
          <h1>Teams</h1>
          <p className="muted">See which lineup is held back, and by whom, before spending more resources.</p>
        </div>
        <div className="teams-header-note" aria-label={`${teams.length} saved team${teams.length === 1 ? "" : "s"}`}>
          <strong>{teams.length}</strong>
          <span>saved team{teams.length === 1 ? "" : "s"}</span>
        </div>
      </header>

      <div className="teams-list">
        {teams.map((team) => {
          const members = team.characterIds
            .map((id) => characters.find((character) => character.id === id))
            .filter((character): character is (typeof characters)[number] => Boolean(character));
          const weakPoint = characters.find((character) => character.id === team.weakPointCharacterId);

          return (
            <article className="card team-card" key={team.id}>
              <div className="team-card-topline">
                <div>
                  <span className="team-kicker">Team composition</span>
                  <h2>{team.name}</h2>
                </div>
                <div className="team-readiness" aria-label={`Team readiness ${team.readiness}%`}>
                  <strong>{team.readiness}%</strong>
                  <span>ready</span>
                </div>
              </div>

              <div className="team-progress" aria-hidden="true">
                <span style={{ width: `${team.readiness}%` }} />
              </div>
              <p className="team-progress-label">Readiness: {team.readiness}%</p>

              <div className="team-members" aria-label={`${team.name} members`}>
                {members.map((character) => {
                  const isWeakPoint = character.id === team.weakPointCharacterId;
                  const stateClass = isWeakPoint || character.status === "needs-work"
                    ? "weak"
                    : character.status === "recommended" || character.status === "complete"
                      ? "strong"
                      : "ready";

                  return (
                    <Link
                      className={`team-member team-member-${stateClass}`}
                      to={`/characters/${character.id}`}
                      key={character.id}
                    >
                      <div className="team-member-avatar" aria-hidden="true">
                        {character.name.slice(0, 1)}
                      </div>
                      <div className="team-member-copy">
                        <strong>{character.name}</strong>
                        <span>{character.role} · Lv.{character.level}</span>
                      </div>
                      <span className="team-member-state">
                        {isWeakPoint ? "Bottleneck" : statusLabel[character.status]}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="team-insight-grid">
                <div className="team-insight team-insight-bottleneck">
                  <span className="team-insight-label">Current bottleneck</span>
                  {weakPoint ? (
                    <Link to={`/characters/${weakPoint.id}`} className="team-bottleneck-link">
                      <strong>{weakPoint.name}</strong>
                      <span>{weakPoint.nextAction}</span>
                    </Link>
                  ) : (
                    <p className="muted">No bottleneck is set for this team.</p>
                  )}
                </div>
                <div className="team-insight">
                  <span className="team-insight-label">Recommendation</span>
                  <p>{team.recommendation}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
