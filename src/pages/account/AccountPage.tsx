import { Link } from "react-router-dom";
import { account, characters } from "../../data/mock";
import "./AccountPage.css";

const statusLabels = {
  "needs-work": "Needs work",
  good: "Good",
  recommended: "Recommended",
  complete: "Complete",
} as const;

const coverage = [
  { label: "DPS", value: account.dpsCoverage },
  { label: "Support", value: account.supportCoverage },
  { label: "Sustain", value: account.sustainCoverage },
] as const;

export function AccountPage() {
  const statusDistribution = characters.reduce<Record<(typeof characters)[number]["status"], number>>(
    (counts, character) => {
      counts[character.status] += 1;
      return counts;
    },
    { "needs-work": 0, good: 0, recommended: 0, complete: 0 },
  );

  const priorityCandidates = [...characters]
    .filter((character) => character.queueStage !== "done")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  const weakestCoverage = coverage.reduce((weakest, current) =>
    current.value < weakest.value ? current : weakest,
  );
  const topCandidate = priorityCandidates[0];

  return (
    <section className="page account-page">
      <header className="page-header account-header">
        <div>
          <div className="eyebrow">Account health</div>
          <h1>{account.displayName}</h1>
          <p className="muted">{account.region} region · account-wide build readiness and role coverage.</p>
        </div>
        <div className="account-identity-badge" aria-label={`${account.displayName}, ${account.region} region`}>
          <span>{account.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{account.displayName}</strong>
            <small>{account.region}</small>
          </div>
        </div>
      </header>

      <div className="account-summary-grid" aria-label="Build readiness counts">
        <article className="card account-stat-card account-stat-ready">
          <span>Ready</span>
          <strong>{account.readyCount}</strong>
          <small>characters</small>
        </article>
        <article className="card account-stat-card account-stat-building">
          <span>Building</span>
          <strong>{account.buildingCount}</strong>
          <small>characters</small>
        </article>
        <article className="card account-stat-card account-stat-needs-work">
          <span>Needs work</span>
          <strong>{account.needsWorkCount}</strong>
          <small>characters</small>
        </article>
      </div>

      <div className="account-main-grid">
        <article className="card account-section-card">
          <div className="account-section-heading">
            <div>
              <span className="account-section-kicker">Role coverage</span>
              <h2>Coverage health</h2>
            </div>
            <span className="account-weakness-chip">Weakest: {weakestCoverage.label} {weakestCoverage.value}%</span>
          </div>

          <div className="coverage-list">
            {coverage.map((item) => (
              <div className="coverage-row" key={item.label}>
                <div className="coverage-copy">
                  <strong>{item.label}</strong>
                  <span>{item.value}% coverage</span>
                </div>
                <div className="coverage-track" aria-hidden="true">
                  <span style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card account-section-card">
          <div className="account-section-heading">
            <div>
              <span className="account-section-kicker">Roster distribution</span>
              <h2>Build statuses</h2>
            </div>
            <span className="muted account-total-label">{characters.length} shown</span>
          </div>

          <div className="status-distribution">
            {Object.entries(statusDistribution).map(([status, count]) => (
              <div className="status-distribution-row" key={status}>
                <span className={`account-status-dot account-status-dot-${status}`} aria-hidden="true" />
                <span>{statusLabels[status as keyof typeof statusLabels]}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="card account-priority-card">
        <div className="account-section-heading">
          <div>
            <span className="account-section-kicker">Improvement priority</span>
            <h2>Best places to invest next</h2>
          </div>
          <p className="muted">Ordered by the existing priority field.</p>
        </div>

        {priorityCandidates.length > 0 ? (
          <div className="priority-list">
            {priorityCandidates.map((character, index) => (
              <Link className="priority-row" to={`/characters/${character.id}`} key={character.id}>
                <span className="priority-rank">#{index + 1}</span>
                <div className="priority-character">
                  <strong>{character.name}</strong>
                  <span>{character.role} · {statusLabels[character.status]}</span>
                </div>
                <div className="priority-score">
                  <strong>{character.priority}</strong>
                  <span>priority</span>
                </div>
                <p>{character.nextAction}</p>
                <span className="priority-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted account-empty-copy">No active improvement candidates in the current roster.</p>
        )}
      </article>

      <article className="account-guidance" aria-label="Account guidance">
        <span className="account-section-kicker">Account guidance</span>
        <h2>Strengthen {weakestCoverage.label} coverage first.</h2>
        <p>
          {weakestCoverage.label} is currently the lowest role coverage at {weakestCoverage.value}%.
          {topCandidate
            ? ` ${topCandidate.name} is the highest-priority active build (${topCandidate.priority}) and the current action is: ${topCandidate.nextAction}.`
            : " There are no active build candidates in the current roster."}
        </p>
      </article>
    </section>
  );
}
