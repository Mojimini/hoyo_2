import { Link } from "react-router-dom";
import { account, characters } from "../../data/mock";
import type { BuildQueueStage, BuildStatus, CharacterSummary } from "../../types/models";
import "./DashboardPage.css";

const statusLabels: Record<BuildStatus, string> = {
  "needs-work": "Needs work",
  good: "Good",
  recommended: "Recommended",
  complete: "Complete",
};

const queueLabels: Record<BuildQueueStage, string> = {
  current: "Current",
  next: "Next",
  later: "Later",
  done: "Done",
};

const statusOrder: BuildStatus[] = ["needs-work", "good", "recommended", "complete"];

function StatusBadge({ status }: { status: BuildStatus }) {
  return (
    <span className={`dashboard-status dashboard-status--${status}`}>
      <span className="dashboard-status__mark" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function CharacterIdentity({ character }: { character: CharacterSummary }) {
  return (
    <div className="dashboard-character-identity">
      <span className="dashboard-character-identity__name">{character.name}</span>
      <span className="dashboard-character-identity__meta">
        {character.element} · {character.role} · Lv. {character.level}
      </span>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="dashboard-empty">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export function DashboardPage() {
  const active = characters.find((character) => character.queueStage === "current");
  const recommendedNext = [...characters]
    .filter((character) => character.queueStage !== "current" && character.queueStage !== "done")
    .sort((a, b) => b.priority - a.priority);
  const needsAttention = characters.filter((character) => character.status === "needs-work");
  const readyDone = characters.filter(
    (character) => character.queueStage === "done" || character.status === "complete",
  );
  const buildStatusCounts = characters.reduce<Record<BuildStatus, number>>(
    (counts, character) => {
      counts[character.status] += 1;
      return counts;
    },
    { "needs-work": 0, good: 0, recommended: 0, complete: 0 },
  );
  const nextActions = active
    ? [active, ...recommendedNext.slice(0, 2)]
    : recommendedNext.slice(0, 3);

  return (
    <section className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <div className="eyebrow">Account build dashboard</div>
          <h1>{account.displayName}</h1>
          <p className="muted dashboard-header__subtitle">
            {account.region} region · See what is ready, what needs work, and what to build next.
          </p>
        </div>
        <div className="dashboard-account-mark" aria-label={`${account.region} account`}>
          <span>Region</span>
          <strong>{account.region}</strong>
        </div>
      </header>

      <div className="dashboard-account-summary" aria-label="Account build summary">
        <div className="dashboard-account-stat">
          <span>Ready</span>
          <strong>{account.readyCount}</strong>
          <small>characters prepared</small>
        </div>
        <div className="dashboard-account-stat">
          <span>Building</span>
          <strong>{account.buildingCount}</strong>
          <small>in active investment</small>
        </div>
        <div className="dashboard-account-stat">
          <span>Needs work</span>
          <strong>{account.needsWorkCount}</strong>
          <small>still below target</small>
        </div>
        <div className="dashboard-coverage-card">
          <span className="dashboard-coverage-card__title">Role coverage</span>
          <div className="dashboard-coverage-row">
            <span>DPS</span>
            <strong>{account.dpsCoverage}%</strong>
          </div>
          <div className="dashboard-coverage-row">
            <span>Support</span>
            <strong>{account.supportCoverage}%</strong>
          </div>
          <div className="dashboard-coverage-row">
            <span>Sustain</span>
            <strong>{account.sustainCoverage}%</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-hero-grid">
        <article className="card dashboard-current-card">
          <div className="dashboard-section-heading dashboard-section-heading--compact">
            <div>
              <span className="dashboard-section-kicker">Focus now</span>
              <h2>Currently Building</h2>
            </div>
            {active ? <StatusBadge status={active.status} /> : null}
          </div>

          {active ? (
            <>
              <div className="dashboard-current-main">
                <div>
                  <Link className="dashboard-current-name" to={`/characters/${active.id}`}>
                    {active.name}
                  </Link>
                  <p className="muted dashboard-current-meta">
                    {active.element} · {active.role} · Level {active.level}
                  </p>
                </div>
                <div className="dashboard-score" aria-label={`Build readiness ${active.buildScore} out of 100`}>
                  <span>Build readiness</span>
                  <strong>{active.buildScore}<small>/100</small></strong>
                </div>
              </div>

              <div className="dashboard-progress-block">
                <div className="dashboard-progress-label">
                  <span>Progress</span>
                  <strong>{active.buildScore}%</strong>
                </div>
                <div
                  className="dashboard-progress-track"
                  role="progressbar"
                  aria-label={`${active.name} build progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={active.buildScore}
                >
                  <span
                    className="dashboard-progress-fill"
                    style={{ width: `${Math.max(0, Math.min(active.buildScore, 100))}%` }}
                  />
                </div>
              </div>

              <div className="dashboard-stat-grid" aria-label={`${active.name} target stats`}>
                {active.stats.map((stat) => (
                  <div className="dashboard-stat" key={stat.key}>
                    <span>{stat.label}</span>
                    <strong>
                      {stat.current}{stat.unit ?? ""}
                      <small> / {stat.target}{stat.unit ?? ""}</small>
                    </strong>
                    <em>Current / target</em>
                  </div>
                ))}
              </div>

              <div className="dashboard-next-action-callout">
                <div>
                  <span>Next useful action</span>
                  <strong>{active.nextAction}</strong>
                </div>
                <Link to={`/characters/${active.id}`}>Open build →</Link>
              </div>
            </>
          ) : (
            <EmptyState
              title="No active build"
              body="Choose a character from Recommended Next to start a focused build queue."
            />
          )}
        </article>

        <section className="card dashboard-actions-card" aria-labelledby="next-actions-heading">
          <div className="dashboard-section-heading dashboard-section-heading--compact">
            <div>
              <span className="dashboard-section-kicker">Do this now</span>
              <h2 id="next-actions-heading">Next Actions</h2>
            </div>
          </div>
          {nextActions.length > 0 ? (
            <ol className="dashboard-action-list">
              {nextActions.map((character, index) => (
                <li key={character.id}>
                  <span className="dashboard-action-index">{index + 1}</span>
                  <div>
                    <Link to={`/characters/${character.id}`}>{character.name}</Link>
                    <p>{character.nextAction}</p>
                    <span className="dashboard-action-context">
                      {queueLabels[character.queueStage]} · Priority {character.priority}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Nothing urgent"
              body="Your current queue has no immediate follow-up actions."
            />
          )}
        </section>
      </div>

      <section className="dashboard-section" aria-labelledby="status-summary-heading">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">Snapshot</span>
            <h2 id="status-summary-heading">Build Status</h2>
          </div>
          <span className="muted">{characters.length} tracked characters</span>
        </div>
        <div className="dashboard-status-grid">
          {statusOrder.map((status) => (
            <div className="card dashboard-status-summary" key={status}>
              <StatusBadge status={status} />
              <strong>{buildStatusCounts[status]}</strong>
              <span>characters</span>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-two-column">
        <section className="card dashboard-section-card" aria-labelledby="recommended-next-heading">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-section-kicker">Priority order</span>
              <h2 id="recommended-next-heading">Recommended Next</h2>
            </div>
            <span className="muted">Uses existing priority values</span>
          </div>

          {recommendedNext.length > 0 ? (
            <div className="dashboard-ranked-list">
              {recommendedNext.map((character, index) => (
                <Link
                  className="dashboard-ranked-row"
                  to={`/characters/${character.id}`}
                  key={character.id}
                >
                  <span className="dashboard-rank">#{index + 1}</span>
                  <CharacterIdentity character={character} />
                  <div className="dashboard-ranked-row__action">{character.nextAction}</div>
                  <span className="dashboard-priority">
                    <small>Priority</small>
                    <strong>{character.priority}</strong>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recommendations queued"
              body="There are no next or later characters waiting in the current mock queue."
            />
          )}
        </section>

        <section className="card dashboard-section-card" aria-labelledby="needs-attention-heading">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-section-kicker">Fix first</span>
              <h2 id="needs-attention-heading">Needs Attention</h2>
            </div>
          </div>

          {needsAttention.length > 0 ? (
            <div className="dashboard-attention-list">
              {needsAttention.map((character) => (
                <Link
                  className="dashboard-attention-row"
                  to={`/characters/${character.id}`}
                  key={character.id}
                >
                  <div className="dashboard-attention-row__topline">
                    <CharacterIdentity character={character} />
                    <StatusBadge status={character.status} />
                  </div>
                  <p>{character.nextAction}</p>
                  <div className="dashboard-attention-row__footer">
                    <span>{queueLabels[character.queueStage]} in queue</span>
                    <strong>Priority {character.priority}</strong>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No critical build gaps"
              body="No tracked characters are currently marked as Needs work."
            />
          )}
        </section>
      </div>

      <section className="dashboard-section" aria-labelledby="ready-done-heading">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">Safe to pause</span>
            <h2 id="ready-done-heading">Ready / Done</h2>
          </div>
          <span className="muted">Keep investment focused elsewhere</span>
        </div>

        {readyDone.length > 0 ? (
          <div className="dashboard-ready-grid">
            {readyDone.map((character) => (
              <Link className="card dashboard-ready-card" to={`/characters/${character.id}`} key={character.id}>
                <div className="dashboard-ready-card__topline">
                  <CharacterIdentity character={character} />
                  <span className="dashboard-queue-tag">{queueLabels[character.queueStage]}</span>
                </div>
                <p>{character.nextAction}</p>
                <div className="dashboard-ready-card__footer">
                  <StatusBadge status={character.status} />
                  <span>Build readiness {character.buildScore}/100</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No finished builds yet"
            body="Characters marked Done or Complete will appear here."
          />
        )}
      </section>
    </section>
  );
}
