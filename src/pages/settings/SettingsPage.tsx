import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";
import { account, characters, teams } from "../../data/mock";
import "./SettingsPage.css";

const activeQueueCount = characters.filter((character) => character.queueStage !== "done").length;

export function SettingsPage() {
  return (
    <section className="page settings-page">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Review the preview data context and the rules this UI currently follows before real account integration is added."
        actions={<span className="settings-preview-pill">Preview only</span>}
      />

      <div className="settings-overview-grid" aria-label="Current preview context">
        <article className="card settings-summary-card">
          <span>Data source</span>
          <strong>Canonical mock dataset</strong>
          <small>No provider or account connection is active.</small>
        </article>
        <article className="card settings-summary-card">
          <span>Region</span>
          <strong>{account.region}</strong>
          <small>Inherited from the current preview account.</small>
        </article>
        <article className="card settings-summary-card">
          <span>Persistence</span>
          <strong>Session-only UI</strong>
          <small>Planner changes reset when the page reloads.</small>
        </article>
      </div>

      <div className="settings-content-grid">
        <article className="card settings-panel">
          <div className="settings-panel-heading">
            <div>
              <span className="settings-kicker">Account context</span>
              <h2>Preview profile</h2>
            </div>
            <Link className="settings-inline-link" to="/account">Open account →</Link>
          </div>

          <dl className="settings-detail-list">
            <div>
              <dt>Profile</dt>
              <dd>{account.displayName}</dd>
            </div>
            <div>
              <dt>Region</dt>
              <dd>{account.region}</dd>
            </div>
            <div>
              <dt>Characters loaded</dt>
              <dd>{characters.length}</dd>
            </div>
            <div>
              <dt>Teams loaded</dt>
              <dd>{teams.length}</dd>
            </div>
          </dl>
        </article>

        <article className="card settings-panel">
          <div className="settings-panel-heading">
            <div>
              <span className="settings-kicker">Build behavior</span>
              <h2>Current rules</h2>
            </div>
            <Link className="settings-inline-link" to="/planner">Open planner →</Link>
          </div>

          <div className="settings-rule-list">
            <div>
              <span className="settings-rule-state">Canonical</span>
              <div>
                <strong>Priority ordering</strong>
                <p>Uses the existing character priority field only; no new scoring is calculated here.</p>
              </div>
            </div>
            <div>
              <span className="settings-rule-state">Canonical</span>
              <div>
                <strong>Target stats</strong>
                <p>Uses the target values already present in the shared character data.</p>
              </div>
            </div>
            <div>
              <span className="settings-rule-state settings-rule-state-local">Local</span>
              <div>
                <strong>Planner queue changes</strong>
                <p>{activeQueueCount} active preview builds can be rearranged locally without mutating the source dataset.</p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <aside className="settings-notice" aria-label="Preview limitations">
        <div>
          <span className="settings-kicker">Before real data integration</span>
          <h2>Nothing on this page writes to an account or provider.</h2>
          <p>
            This route intentionally exposes the current preview state instead of presenting controls that would imply persistence.
            Account source, authentication, saved preferences, and provider-backed settings will be added only when those contracts exist.
          </p>
        </div>
        <Link className="settings-primary-link" to="/">Back to overview</Link>
      </aside>
    </section>
  );
}
