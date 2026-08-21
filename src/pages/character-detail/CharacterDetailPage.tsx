import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { characters } from "../../data/mock";
import type { BuildQueueStage, BuildStatus, CharacterStat } from "../../types/models";
import "./CharacterDetailPage.css";

const tabs = ["Overview", "Stats", "Equipment", "Relics", "Traces", "Teams"] as const;
type DetailTab = (typeof tabs)[number];

const statusLabels: Record<BuildStatus, string> = {
  "needs-work": "Needs work",
  good: "Good",
  recommended: "Recommended",
  complete: "Complete",
};

const queueLabels: Record<BuildQueueStage, string> = {
  current: "Current build",
  next: "Next in queue",
  later: "Later in queue",
  done: "Queue complete",
};

const investmentGuidance: Record<BuildQueueStage, Record<BuildStatus, string>> = {
  current: {
    "needs-work": "Keep building this character now; the current queue and readiness state both indicate unfinished work.",
    good: "Keep building while this character remains the current queue focus, then reassess after the listed next upgrade.",
    recommended: "Only continue with the listed next upgrade while this character remains the current queue focus.",
    complete: "The build is marked complete; move on once the current queue entry is cleared.",
  },
  next: {
    "needs-work": "Plan to invest next. The character still needs work and is already next in the build queue.",
    good: "This character is next in the queue; make the listed upgrade when the current build is finished.",
    recommended: "The build is already recommended, so treat the queued upgrade as optional refinement rather than urgent work.",
    complete: "No additional investment is indicated by the current readiness state; keep the queue entry only if you still want optional refinement.",
  },
  later: {
    "needs-work": "More investment is still indicated, but the queue places this character behind higher-priority work.",
    good: "The build is usable for now. Defer further investment until earlier queue items are finished.",
    recommended: "Further investment is not urgent; the build is recommended and this character is scheduled for later.",
    complete: "No further investment is indicated by the current readiness state.",
  },
  done: {
    "needs-work": "The readiness state still says this build needs work even though the queue is done; review the tracked targets before deciding to reopen investment.",
    good: "The queue is done. Further work is optional unless you choose to reopen this character based on the remaining tracked gaps.",
    recommended: "Stop for now. The build is recommended and the queue is already complete.",
    complete: "Stop building for now. Both readiness and queue state indicate completion.",
  },
};

function formatStat(stat: CharacterStat, value: number) {
  return `${value}${stat.unit ?? ""}`;
}

function StatTable({ stats }: { stats: CharacterStat[] }) {
  return (
    <div className="detail-stat-list" role="list" aria-label="Target stats">
      {stats.map((stat) => {
        const reached = stat.current >= stat.target;
        return (
          <div className="detail-stat-row" role="listitem" key={stat.key}>
            <div>
              <strong>{stat.label}</strong>
              <span className="detail-stat-state" data-reached={reached}>
                {reached ? "✓ Target reached" : "↑ Target not reached"}
              </span>
            </div>
            <div className="detail-stat-values">
              <span><small>Current</small>{formatStat(stat, stat.current)}</span>
              <span><small>Target</small>{formatStat(stat, stat.target)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CharacterDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const character = characters.find((item) => item.id === id);

  if (!character) {
    return (
      <section className="page detail-not-found">
        <div className="detail-not-found-card">
          <span className="detail-kicker">Character analysis</span>
          <h1>Character not found</h1>
          <p>The requested character is not available in the current mock account data.</p>
          <Link className="detail-back-link" to="/characters">← Back to characters</Link>
        </div>
      </section>
    );
  }

  const strengths = character.stats.filter((stat) => stat.current >= stat.target);
  const improvements = character.stats.filter((stat) => stat.current < stat.target);

  return (
    <section className="page character-detail-page">
      <Link className="detail-back-link detail-top-back" to="/characters">← Characters</Link>

      <header className="detail-hero">
        <div className="detail-identity">
          <div className="detail-avatar" aria-hidden="true">{character.name.slice(0, 1)}</div>
          <div>
            <span className="detail-kicker">Character analysis</span>
            <h1>{character.name}</h1>
            <p>{character.element} · {character.role} · Lv.{character.level}</p>
          </div>
        </div>
        <div className="detail-hero-status">
          <div className="detail-score"><strong>{character.buildScore}</strong><span>Build score</span></div>
          <span className="detail-status-pill" data-status={character.status}>{statusLabels[character.status]}</span>
          <span className="detail-queue-pill">{queueLabels[character.queueStage]}</span>
        </div>
      </header>

      <nav className="detail-tabs" aria-label="Character detail sections">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab ? "is-active" : ""}
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Overview" && (
        <div className="detail-overview-grid">
          <article className="detail-card detail-summary-card">
            <div className="detail-card-heading">
              <div><span className="detail-kicker">Build overview</span><h2>What is working, what is missing</h2></div>
            </div>
            <div className="detail-summary-columns">
              <section>
                <h3>Strengths</h3>
                {strengths.length ? (
                  <ul>{strengths.map((stat) => <li key={stat.key}><strong>{stat.label}</strong> meets the tracked target at {formatStat(stat, stat.current)}.</li>)}</ul>
                ) : <p>No tracked target stats have been reached yet.</p>}
              </section>
              <section>
                <h3>Improvement areas</h3>
                {improvements.length ? (
                  <ul>{improvements.map((stat) => <li key={stat.key}><strong>{stat.label}</strong> is {formatStat(stat, stat.current)} against a target of {formatStat(stat, stat.target)}.</li>)}</ul>
                ) : <p>All currently tracked target stats are reached.</p>}
              </section>
            </div>
          </article>

          <article className="detail-card detail-upgrade-card">
            <span className="detail-kicker">Highest-value queued action</span>
            <h2>Next Best Upgrade</h2>
            <p className="detail-upgrade-action">{character.nextAction}</p>
            <span className="detail-context-note">Shown directly from the existing character recommendation data.</span>
          </article>

          <article className="detail-card detail-stats-card">
            <div className="detail-card-heading">
              <div><span className="detail-kicker">Tracked targets</span><h2>Current vs target stats</h2></div>
              <span className="detail-count">{strengths.length}/{character.stats.length} reached</span>
            </div>
            <StatTable stats={character.stats} />
          </article>

          <article className="detail-card detail-investment-card">
            <span className="detail-kicker">Investment guidance</span>
            <h2>Should I keep building?</h2>
            <p className="detail-guidance">{investmentGuidance[character.queueStage][character.status]}</p>
            <div className="detail-guidance-facts">
              <span><small>Readiness</small>{statusLabels[character.status]}</span>
              <span><small>Queue</small>{queueLabels[character.queueStage]}</span>
            </div>
            <span className="detail-context-note">Guidance uses only the existing readiness and build-queue states.</span>
          </article>
        </div>
      )}

      {activeTab === "Stats" && (
        <article className="detail-card detail-tab-panel">
          <span className="detail-kicker">Stats</span>
          <h2>Tracked target stats</h2>
          <p className="detail-tab-copy">Only stats present in the current mock data are shown.</p>
          <StatTable stats={character.stats} />
        </article>
      )}

      {activeTab !== "Overview" && activeTab !== "Stats" && (
        <article className="detail-card detail-tab-panel detail-placeholder">
          <span className="detail-kicker">{activeTab}</span>
          <h2>{activeTab} data is not available yet</h2>
          <p>This section is reserved for a future data source. No {activeTab.toLowerCase()} values are included in the current character contract, so nothing is inferred here.</p>
        </article>
      )}
    </section>
  );
}
