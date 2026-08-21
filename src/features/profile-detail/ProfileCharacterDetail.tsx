import type { ReactNode } from "react";
import { Card } from "../../components/ui";
import type {
  ProfileField,
  ProfileFieldState,
  ProfileSourceMetadata,
  PublicProfileCharacter,
  PublicProfileLightCone,
  PublicProfileRelic,
  PublicProfileRelicStat,
  PublicProfileStat,
  PublicProfileTrace,
} from "../../profile/contracts";
import "./ProfileCharacterDetail.css";

export interface ProfileCharacterDetailProps {
  character: PublicProfileCharacter;
  source?: ProfileSourceMetadata;
}

export interface ProfileCharacterHeroProps {
  character: PublicProfileCharacter;
}

export interface ProfileSourceStatusProps {
  source: ProfileSourceMetadata;
}

export interface ProfileStatListProps {
  stats: ProfileField<readonly PublicProfileStat[]>;
}

export interface ProfileLightConeCardProps {
  lightCone: ProfileField<PublicProfileLightCone | null>;
}

export interface ProfileRelicGridProps {
  relics: ProfileField<readonly PublicProfileRelic[]>;
}

export interface ProfileTraceListProps {
  traces: ProfileField<readonly PublicProfileTrace[]>;
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  accessory?: ReactNode;
}

interface DataStateNoticeProps {
  state: ProfileFieldState;
  noun: string;
  note?: string;
  compact?: boolean;
}

function humanizeToken(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatStatValue(stat: PublicProfileStat | PublicProfileRelicStat) {
  return `${stat.value}${stat.unit ?? ""}`;
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function SectionHeading({ eyebrow, title, description, accessory }: SectionHeadingProps) {
  return (
    <div className="profile-detail__section-heading">
      <div>
        <div className="profile-detail__eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {accessory ? <div className="profile-detail__section-accessory">{accessory}</div> : null}
    </div>
  );
}

function DataStateNotice({ state, noun, note, compact = false }: DataStateNoticeProps) {
  if (state === "available" && !note) return null;

  const title = state === "partial" ? `Partial ${noun}` : state === "unavailable" ? `${noun} unavailable` : `${noun} note`;
  const fallback =
    state === "partial"
      ? `Only part of the ${noun.toLowerCase()} data was present in this snapshot.`
      : state === "unavailable"
        ? `The source did not provide ${noun.toLowerCase()} data for this snapshot.`
        : undefined;

  return (
    <div
      className={`profile-detail__state-notice profile-detail__state-notice--${state}${compact ? " profile-detail__state-notice--compact" : ""}`}
      role="status"
    >
      <strong>{title}</strong>
      {note ?? fallback ? <span>{note ?? fallback}</span> : null}
    </div>
  );
}

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="profile-detail__image-placeholder" aria-label={`${label} image unavailable`}>
      <span aria-hidden="true">—</span>
      <small>No image</small>
    </div>
  );
}

export function ProfileCharacterHero({ character }: ProfileCharacterHeroProps) {
  return (
    <Card className="profile-detail__hero" aria-labelledby={`profile-character-${character.id}`}>
      <div className="profile-detail__portrait-wrap">
        {character.portraitUrl ? (
          <img className="profile-detail__portrait" src={character.portraitUrl} alt={`${character.name} portrait`} />
        ) : character.iconUrl ? (
          <img className="profile-detail__portrait profile-detail__portrait--icon" src={character.iconUrl} alt={`${character.name} icon`} />
        ) : (
          <ImagePlaceholder label={character.name} />
        )}
      </div>

      <div className="profile-detail__hero-copy">
        <div className="profile-detail__eyebrow">Public profile character</div>
        <h1 id={`profile-character-${character.id}`}>{character.name}</h1>
        <div className="profile-detail__identity-line" aria-label="Character identity details">
          <span>Level {character.level}</span>
          {character.element ? <span>{character.element}</span> : null}
          {character.path ? <span>{character.path}</span> : null}
        </div>

        <div className="profile-detail__identity-grid">
          <div>
            <span className="profile-detail__label">Eidolon</span>
            <strong>{character.eidolon !== undefined ? `E${character.eidolon}` : "Unavailable"}</strong>
          </div>
          {character.ascension !== undefined ? (
            <div>
              <span className="profile-detail__label">Ascension</span>
              <strong>{character.ascension}</strong>
            </div>
          ) : null}
          <div>
            <span className="profile-detail__label">Character ID</span>
            <strong className="profile-detail__mono">{character.id}</strong>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ProfileSourceStatus({ source }: ProfileSourceStatusProps) {
  return (
    <Card className="profile-detail__source" aria-label="Profile source status">
      <div className="profile-detail__source-main">
        <div>
          <div className="profile-detail__eyebrow">Source snapshot</div>
          <div className="profile-detail__source-title">
            <strong>{source.provider}</strong>
            <span className={`profile-detail__freshness profile-detail__freshness--${source.freshness}`}>
              {humanizeToken(source.freshness)}
            </span>
            {source.isPartial ? <span className="profile-detail__partial-chip">Partial snapshot</span> : null}
          </div>
        </div>

        <dl className="profile-detail__source-meta">
          <div>
            <dt>UID</dt>
            <dd className="profile-detail__mono">{source.uid}</dd>
          </div>
          <div>
            <dt>Fetched</dt>
            <dd>
              <time dateTime={source.fetchedAt}>{formatTimestamp(source.fetchedAt)}</time>
            </dd>
          </div>
          {source.expiresAt ? (
            <div>
              <dt>Expires</dt>
              <dd>
                <time dateTime={source.expiresAt}>{formatTimestamp(source.expiresAt)}</time>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </Card>
  );
}

export function ProfileStatList({ stats }: ProfileStatListProps) {
  return (
    <Card className="profile-detail__section-card">
      <SectionHeading
        eyebrow="Normalized data"
        title="Character stats"
        description="Values are shown exactly as supplied by the canonical profile snapshot."
        accessory={
          stats.state === "partial" ? <span className="profile-detail__partial-chip">Partial</span> : undefined
        }
      />

      {stats.state === "unavailable" ? (
        <DataStateNotice state={stats.state} noun="Stats" note={stats.note} />
      ) : (
        <>
          <DataStateNotice state={stats.state} noun="Stats" note={stats.note} />
          {stats.value.length > 0 ? (
            <dl className="profile-detail__stat-list">
              {stats.value.map((stat) => (
                <div className="profile-detail__stat-row" key={stat.key}>
                  <dt>{stat.label}</dt>
                  <dd>{formatStatValue(stat)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="profile-detail__empty-copy">No stat rows were included in this snapshot.</p>
          )}
        </>
      )}
    </Card>
  );
}

export function ProfileLightConeCard({ lightCone }: ProfileLightConeCardProps) {
  return (
    <Card className="profile-detail__section-card">
      <SectionHeading
        eyebrow="Equipment"
        title="Light cone"
        accessory={
          lightCone.state === "partial" ? <span className="profile-detail__partial-chip">Partial</span> : undefined
        }
      />

      {lightCone.state === "unavailable" ? (
        <DataStateNotice state={lightCone.state} noun="Light cone" note={lightCone.note} />
      ) : lightCone.value === null ? (
        <>
          <DataStateNotice state={lightCone.state} noun="Light cone" note={lightCone.note} />
          <p className="profile-detail__empty-copy">No light cone was included in this profile snapshot.</p>
        </>
      ) : (
        <>
          <DataStateNotice state={lightCone.state} noun="Light cone" note={lightCone.note} />
          <div className="profile-detail__light-cone">
            <div className="profile-detail__equipment-image-wrap">
              {lightCone.value.iconUrl ? (
                <img src={lightCone.value.iconUrl} alt={`${lightCone.value.name} icon`} />
              ) : (
                <ImagePlaceholder label={lightCone.value.name} />
              )}
            </div>
            <div className="profile-detail__equipment-copy">
              <strong>{lightCone.value.name}</strong>
              <span>Level {lightCone.value.level}</span>
              <div className="profile-detail__equipment-meta">
                {lightCone.value.superimposition !== undefined ? (
                  <span>Superimposition {lightCone.value.superimposition}</span>
                ) : null}
                {lightCone.value.rarity !== undefined ? <span>{lightCone.value.rarity}★</span> : null}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function RelicMainStat({ relic }: { relic: PublicProfileRelic }) {
  if (relic.mainStat.state === "unavailable") {
    return <DataStateNotice state="unavailable" noun="Main stat" note={relic.mainStat.note} compact />;
  }

  return (
    <div className="profile-detail__relic-main-stat">
      <span>{relic.mainStat.value.label}</span>
      <strong>{formatStatValue(relic.mainStat.value)}</strong>
      <DataStateNotice state={relic.mainStat.state} noun="Main stat" note={relic.mainStat.note} compact />
    </div>
  );
}

function RelicSubstats({ relic }: { relic: PublicProfileRelic }) {
  if (relic.substats.state === "unavailable") {
    return <DataStateNotice state="unavailable" noun="Substats" note={relic.substats.note} compact />;
  }

  return (
    <div className="profile-detail__relic-substats">
      <DataStateNotice state={relic.substats.state} noun="Substats" note={relic.substats.note} compact />
      {relic.substats.value.length > 0 ? (
        <dl>
          {relic.substats.value.map((stat, index) => (
            <div key={`${stat.key}-${index}`}>
              <dt>{stat.label}</dt>
              <dd>{formatStatValue(stat)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <span className="profile-detail__relic-empty">No substats included.</span>
      )}
    </div>
  );
}

export function ProfileRelicGrid({ relics }: ProfileRelicGridProps) {
  return (
    <Card className="profile-detail__section-card">
      <SectionHeading
        eyebrow="Equipment"
        title="Relics"
        description="Each piece preserves the source slot, main stat, and supplied substats without inferring missing values."
        accessory={
          relics.state === "partial" ? <span className="profile-detail__partial-chip">Partial</span> : undefined
        }
      />

      {relics.state === "unavailable" ? (
        <DataStateNotice state={relics.state} noun="Relics" note={relics.note} />
      ) : (
        <>
          <DataStateNotice state={relics.state} noun="Relics" note={relics.note} />
          {relics.value.length > 0 ? (
            <div className="profile-detail__relic-grid">
              {relics.value.map((relic, index) => (
                <article
                  className="profile-detail__relic"
                  key={relic.id ?? `${relic.slot}-${index}`}
                  aria-label={`${humanizeToken(relic.slot)} relic`}
                >
                  <div className="profile-detail__relic-header">
                    <div className="profile-detail__relic-image-wrap">
                      {relic.iconUrl ? (
                        <img src={relic.iconUrl} alt={relic.name ? `${relic.name} icon` : `${humanizeToken(relic.slot)} relic icon`} />
                      ) : (
                        <ImagePlaceholder label={relic.name ?? humanizeToken(relic.slot)} />
                      )}
                    </div>
                    <div>
                      <span className="profile-detail__slot-label">{humanizeToken(relic.slot)}</span>
                      <strong>{relic.name ?? "Name unavailable"}</strong>
                      <div className="profile-detail__equipment-meta">
                        {relic.level !== undefined ? <span>Lv. {relic.level}</span> : null}
                        {relic.rarity !== undefined ? <span>{relic.rarity}★</span> : null}
                      </div>
                    </div>
                  </div>
                  <RelicMainStat relic={relic} />
                  <RelicSubstats relic={relic} />
                </article>
              ))}
            </div>
          ) : (
            <p className="profile-detail__empty-copy">No relic pieces were included in this snapshot.</p>
          )}
        </>
      )}
    </Card>
  );
}

export function ProfileTraceList({ traces }: ProfileTraceListProps) {
  return (
    <Card className="profile-detail__section-card">
      <SectionHeading
        eyebrow="Progression"
        title="Traces & skills"
        description="Only trace levels explicitly present in the profile snapshot are displayed."
        accessory={
          traces.state === "partial" ? <span className="profile-detail__partial-chip">Partial</span> : undefined
        }
      />

      {traces.state === "unavailable" ? (
        <DataStateNotice state={traces.state} noun="Trace data" note={traces.note} />
      ) : (
        <>
          <DataStateNotice state={traces.state} noun="Trace data" note={traces.note} />
          {traces.value.length > 0 ? (
            <div className="profile-detail__trace-grid">
              {traces.value.map((trace) => (
                <div className="profile-detail__trace" key={trace.key}>
                  <div>
                    <span className="profile-detail__trace-kind">
                      {trace.kind ? humanizeToken(trace.kind) : "Trace"}
                    </span>
                    <strong>{trace.name}</strong>
                  </div>
                  <span className="profile-detail__trace-level">
                    Lv. {trace.level}
                    {trace.maxLevel !== undefined ? ` / ${trace.maxLevel}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="profile-detail__empty-copy">No trace or skill levels were included in this snapshot.</p>
          )}
        </>
      )}
    </Card>
  );
}

export function ProfileCharacterDetail({ character, source }: ProfileCharacterDetailProps) {
  return (
    <div className="profile-detail">
      <ProfileCharacterHero character={character} />
      {source ? <ProfileSourceStatus source={source} /> : null}
      <div className="profile-detail__overview-grid">
        <ProfileStatList stats={character.stats} />
        <ProfileLightConeCard lightCone={character.lightCone} />
      </div>
      <ProfileRelicGrid relics={character.relics} />
      <ProfileTraceList traces={character.traces} />
    </div>
  );
}
