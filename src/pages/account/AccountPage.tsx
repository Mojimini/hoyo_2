import { Link } from "react-router-dom";
import { account, characters } from "../../data/mock";
import { ProfileSourcePanel, type ProfileSourceStatus } from "../../features/profile-source";
import { usePublicProfile } from "../../profile/react/PublicProfileContext";
import "./AccountPage.css";
import "./AccountLive.css";

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
  const { state, snapshot, error, isStale, activeUid, load, refresh } = usePublicProfile();

  const sourceStatus: ProfileSourceStatus =
    state.status === "loading" || state.status === "refreshing"
      ? "loading"
      : state.status === "error"
        ? "error"
        : snapshot
          ? "success"
          : "idle";

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
          <div className="eyebrow">Account workspace</div>
          <h1>Account</h1>
          <p className="muted">Load a public Honkai: Star Rail showcase, then review the planning preview below.</p>
        </div>
      </header>

      <section className="account-live" aria-labelledby="public-profile-heading">
        <div className="account-live__heading">
          <div>
            <span className="account-section-kicker">Real public data</span>
            <h2 id="public-profile-heading">Public UID showcase</h2>
            <p className="muted">Session-only data from the public showcase provider. No HoYoLAB credentials are requested or stored.</p>
          </div>
          {activeUid ? <span className="account-live__uid">UID {activeUid}</span> : null}
        </div>

        <ProfileSourcePanel
          initialUid={activeUid ?? ""}
          status={sourceStatus}
          error={error}
          successMessage={snapshot ? `${snapshot.characters.length} showcased character${snapshot.characters.length === 1 ? "" : "s"} loaded.` : undefined}
          onSubmit={load}
        />

        {snapshot ? (
          <div className="account-live__snapshot">
            <article className="card account-live__player">
              <div className="account-live__player-main">
                {snapshot.player.avatarIconUrl ? (
                  <img src={snapshot.player.avatarIconUrl} alt="" className="account-live__avatar" />
                ) : (
                  <div className="account-live__avatar account-live__avatar--placeholder" aria-hidden="true">
                    {(snapshot.player.nickname ?? "P").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="account-section-kicker">Loaded player</span>
                  <h3>{snapshot.player.nickname ?? "Public HSR profile"}</h3>
                  <div className="account-live__player-meta">
                    {snapshot.player.trailblazeLevel !== undefined ? <span>Trailblaze Lv. {snapshot.player.trailblazeLevel}</span> : null}
                    {snapshot.player.equilibriumLevel !== undefined ? <span>Equilibrium {snapshot.player.equilibriumLevel}</span> : null}
                    <span>{snapshot.source.provider}</span>
                  </div>
                </div>
              </div>
              <div className="account-live__actions">
                <span className={`account-live__freshness${isStale ? " is-stale" : ""}`}>
                  {isStale ? "Stale snapshot" : snapshot.source.freshness === "fresh" ? "Fresh snapshot" : snapshot.source.freshness}
                </span>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={state.status === "loading" || state.status === "refreshing"}
                >
                  {state.status === "refreshing" ? "Refreshing…" : "Refresh from provider"}
                </button>
              </div>
            </article>

            {isStale ? (
              <div className="account-live__warning" role="status">
                Showing the last successful snapshot for this same UID because the current refresh did not complete successfully. Treat it as stale until refresh succeeds.
              </div>
            ) : null}

            <div className="account-live__roster-heading">
              <div>
                <span className="account-section-kicker">Public showcase roster</span>
                <h3>{snapshot.characters.length} displayed character{snapshot.characters.length === 1 ? "" : "s"}</h3>
              </div>
              {snapshot.source.isPartial ? <span className="account-live__partial">Partial source data</span> : null}
            </div>

            {snapshot.characters.length > 0 ? (
              <div className="account-live__roster">
                {snapshot.characters.map((character) => (
                  <Link className="account-live__character" to={`/characters/${character.id}`} key={character.id}>
                    <div className="account-live__character-image">
                      {character.iconUrl ? (
                        <img src={character.iconUrl} alt="" />
                      ) : (
                        <span aria-hidden="true">{character.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="account-live__character-copy">
                      <strong>{character.name}</strong>
                      <span>
                        Lv. {character.level}
                        {character.element ? ` · ${character.element}` : ""}
                        {character.path ? ` · ${character.path}` : ""}
                      </span>
                    </div>
                    <span className="account-live__open" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">The loaded public snapshot contains no displayed characters.</p>
            )}
          </div>
        ) : null}
      </section>

      <div className="account-preview-label">
        <span className="account-section-kicker">Planning preview · mock data</span>
        <h2>{account.displayName} · {account.region}</h2>
        <p className="muted">The readiness, coverage, priority, and next-action values below are still the canonical UI preview dataset and are not calculated from the public UID snapshot.</p>
      </div>

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
          <p className="muted">Ordered by the existing mock priority field.</p>
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
          {weakestCoverage.label} is currently the lowest mock role coverage at {weakestCoverage.value}%.
          {topCandidate
            ? ` ${topCandidate.name} is the highest-priority active mock build (${topCandidate.priority}) and the current action is: ${topCandidate.nextAction}.`
            : " There are no active build candidates in the current preview roster."}
        </p>
      </article>
    </section>
  );
}
