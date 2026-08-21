import type { ReactNode } from "react";
import { Card } from "../../components/ui";
import type {
  AnalysisEvidence,
  AnalysisSourceRef,
  CharacterAnalysisResult,
  CharacterBuildEvidence,
  RelicScoreResult,
  TargetStatRange,
} from "../../analysis/contracts";
import {
  evidenceStateDescription,
  evidenceStateLabel,
  formatObservedValue,
  formatTargetRange,
  relicMethodLabel,
  sourceIdentity,
  sourceKindLabel,
} from "./helpers";
import "./BuildAnalysisPanel.css";

export interface BuildAnalysisPanelProps {
  result: CharacterAnalysisResult;
  characterName?: string;
}

export interface EvidenceStatusProps {
  state: AnalysisEvidence<unknown>["state"];
  note?: string;
}

export interface ProvenanceListProps {
  sources: readonly AnalysisSourceRef[];
  label?: string;
}

export interface ObservedBuildEvidenceProps {
  evidence: CharacterBuildEvidence;
}

export interface CommunityRelicScoresProps {
  relicScores: CharacterAnalysisResult["relicScores"];
}

export interface AnalysisOutcomeProps {
  targetStats: CharacterBuildEvidence["targetStats"];
  buildQuality: CharacterAnalysisResult["buildQuality"];
  recommendation: CharacterAnalysisResult["recommendation"];
}

interface EvidenceCardProps {
  eyebrow: string;
  title: string;
  evidence: AnalysisEvidence<unknown>;
  children?: ReactNode;
  className?: string;
}

function EvidenceStatus({ state, note }: EvidenceStatusProps) {
  return (
    <div className={`build-analysis__state build-analysis__state--${state}`} role="status">
      <span className="build-analysis__state-label">{evidenceStateLabel(state)}</span>
      <span className="build-analysis__state-description">{note ?? evidenceStateDescription(state)}</span>
    </div>
  );
}

function ProvenanceList({ sources, label = "Evidence provenance" }: ProvenanceListProps) {
  return (
    <div className="build-analysis__provenance">
      <div className="build-analysis__provenance-heading">{label}</div>
      {sources.length > 0 ? (
        <ul className="build-analysis__source-list">
          {sources.map((source) => (
            <li key={`${source.kind}-${source.name}-${source.revision}-${source.fetchedAt}`}>
              <div className="build-analysis__source-main">
                <strong>{sourceIdentity(source)}</strong>
                <span>{sourceKindLabel(source.kind)}</span>
              </div>
              <div className="build-analysis__source-meta">
                <span>
                  Snapshot: <time dateTime={source.fetchedAt}>{source.fetchedAt}</time>
                </span>
                {source.reference ? <span>Reference: {source.reference}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="build-analysis__empty-copy">No provenance was supplied by the analysis contract.</p>
      )}
    </div>
  );
}

function EvidenceCard({ eyebrow, title, evidence, children, className = "" }: EvidenceCardProps) {
  return (
    <Card className={`build-analysis__evidence-card ${className}`}>
      <div className="build-analysis__section-heading">
        <div>
          <div className="build-analysis__eyebrow">{eyebrow}</div>
          <h3>{title}</h3>
        </div>
        <span className={`build-analysis__state-chip build-analysis__state-chip--${evidence.state}`}>
          {evidenceStateLabel(evidence.state)}
        </span>
      </div>
      <EvidenceStatus state={evidence.state} note={evidence.note} />
      {children}
      <ProvenanceList sources={evidence.sources} />
    </Card>
  );
}

function ObservedStats({ evidence }: { evidence: CharacterBuildEvidence["observedStats"] }) {
  return (
    <EvidenceCard eyebrow="Observed evidence" title="Observed stats" evidence={evidence}>
      {evidence.state !== "unavailable" ? (
        evidence.value.length > 0 ? (
          <dl className="build-analysis__value-list">
            {evidence.value.map((stat) => (
              <div key={stat.key}>
                <dt>{stat.label}</dt>
                <dd>{formatObservedValue(stat.value, stat.unit)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="build-analysis__empty-copy">No observed stat rows were supplied.</p>
        )
      ) : null}
    </EvidenceCard>
  );
}

function ObservedLightCone({ evidence }: { evidence: CharacterBuildEvidence["lightCone"] }) {
  return (
    <EvidenceCard eyebrow="Observed evidence" title="Light cone" evidence={evidence}>
      {evidence.state !== "unavailable" ? (
        evidence.value === null ? (
          <p className="build-analysis__empty-copy">The evidence explicitly reports no equipped light cone.</p>
        ) : (
          <dl className="build-analysis__value-list">
            <div>
              <dt>Name</dt>
              <dd>{evidence.value.name ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{evidence.value.level ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Superimposition</dt>
              <dd>
                {evidence.value.superimposition !== undefined
                  ? `S${evidence.value.superimposition}`
                  : "Not supplied"}
              </dd>
            </div>
          </dl>
        )
      ) : null}
    </EvidenceCard>
  );
}

function ObservedRelics({ evidence }: { evidence: CharacterBuildEvidence["relics"] }) {
  return (
    <EvidenceCard eyebrow="Observed evidence" title="Relic inventory" evidence={evidence}>
      {evidence.state !== "unavailable" ? (
        evidence.value.length > 0 ? (
          <div className="build-analysis__relic-list">
            {evidence.value.map((relic, index) => (
              <article className="build-analysis__relic-row" key={relic.id ?? `${relic.slot}-${index}`}>
                <div>
                  <strong>{relic.slot}</strong>
                  <span>{relic.id ? `ID ${relic.id}` : "Relic ID not supplied"}</span>
                </div>
                <dl>
                  <div>
                    <dt>Level</dt>
                    <dd>{relic.level ?? "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt>Main stat</dt>
                    <dd>{relic.mainStatKey ?? "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt>Observed substats</dt>
                    <dd>{relic.substatKeys.length > 0 ? relic.substatKeys.join(", ") : "None supplied"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="build-analysis__empty-copy">No observed relic rows were supplied.</p>
        )
      ) : null}
    </EvidenceCard>
  );
}

function ObservedTraces({ evidence }: { evidence: CharacterBuildEvidence["traces"] }) {
  return (
    <EvidenceCard eyebrow="Observed evidence" title="Traces" evidence={evidence}>
      {evidence.state !== "unavailable" ? (
        evidence.value.length > 0 ? (
          <dl className="build-analysis__value-list">
            {evidence.value.map((trace) => (
              <div key={trace.key}>
                <dt>{trace.name}</dt>
                <dd>
                  Level {trace.level}
                  {trace.maxLevel !== undefined ? ` / ${trace.maxLevel}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="build-analysis__empty-copy">No trace rows were supplied.</p>
        )
      ) : null}
    </EvidenceCard>
  );
}

export function ObservedBuildEvidence({ evidence }: ObservedBuildEvidenceProps) {
  return (
    <section className="build-analysis__group" aria-labelledby="observed-build-evidence-heading">
      <div className="build-analysis__group-heading">
        <div>
          <div className="build-analysis__eyebrow">Character snapshot</div>
          <h2 id="observed-build-evidence-heading">Observed build evidence</h2>
        </div>
        <p>These values are observations supplied by canonical evidence. They are not scores or recommendations.</p>
      </div>
      <div className="build-analysis__evidence-grid">
        <ObservedStats evidence={evidence.observedStats} />
        <ObservedLightCone evidence={evidence.lightCone} />
        <ObservedRelics evidence={evidence.relics} />
        <ObservedTraces evidence={evidence.traces} />
      </div>
    </section>
  );
}

function RelicScoreDetails({ score }: { score: RelicScoreResult }) {
  return (
    <dl className="build-analysis__score-details">
      <div>
        <dt>Normalized score</dt>
        <dd>{score.normalizedScore}</dd>
      </div>
      <div>
        <dt>Main-stat score</dt>
        <dd>{score.mainStatScore}</dd>
      </div>
      <div>
        <dt>Substat score</dt>
        <dd>{score.substatScore}</dd>
      </div>
      <div>
        <dt>Effective substats</dt>
        <dd>{score.effectiveSubstats}</dd>
      </div>
    </dl>
  );
}

export function CommunityRelicScores({ relicScores }: CommunityRelicScoresProps) {
  return (
    <section className="build-analysis__group" aria-labelledby="community-relic-score-heading">
      <div className="build-analysis__group-heading build-analysis__group-heading--community">
        <div>
          <div className="build-analysis__eyebrow">Community methodology</div>
          <h2 id="community-relic-score-heading">Relic scoring</h2>
        </div>
        <p>
          SRS-N and SRS-M are community methodologies. They are not an official HoYoverse evaluation or in-game rating.
        </p>
      </div>

      <Card className="build-analysis__community-card">
        <EvidenceStatus state={relicScores.state} note={relicScores.note} />
        {relicScores.state !== "unavailable" ? (
          relicScores.value.length > 0 ? (
            <div className="build-analysis__community-list">
              {relicScores.value.map((entry, index) => (
                <article className="build-analysis__community-item" key={entry.relicId ?? `${entry.slot}-${index}`}>
                  <div className="build-analysis__community-item-heading">
                    <div>
                      <span className="build-analysis__method-label">
                        Community methodology · {relicMethodLabel(entry.score.method)}
                      </span>
                      <h3>{entry.slot}</h3>
                      {entry.relicId ? <span className="build-analysis__muted">Relic ID {entry.relicId}</span> : null}
                    </div>
                    <div className="build-analysis__score-callout" aria-label={`Normalized score ${entry.score.normalizedScore}`}>
                      <strong>{entry.score.normalizedScore}</strong>
                      <span>Normalized score</span>
                    </div>
                  </div>
                  <RelicScoreDetails score={entry.score} />
                  {entry.score.note ? <p className="build-analysis__note">{entry.score.note}</p> : null}
                  <div className="build-analysis__method-source">
                    <span>Method source</span>
                    <strong>{sourceIdentity(entry.score.source)}</strong>
                    <small>{sourceKindLabel(entry.score.source.kind)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="build-analysis__empty-copy">No community relic score rows were supplied.</p>
          )
        ) : null}
        <ProvenanceList sources={relicScores.sources} label="Relic score evidence provenance" />
      </Card>
    </section>
  );
}

function TargetStats({ evidence }: { evidence: CharacterBuildEvidence["targetStats"] }) {
  return (
    <EvidenceCard eyebrow="Analysis output" title="Target stats" evidence={evidence}>
      {evidence.state !== "unavailable" ? (
        evidence.value.length > 0 ? (
          <dl className="build-analysis__target-list">
            {evidence.value.map((target: TargetStatRange) => (
              <div key={target.key}>
                <dt>
                  <strong>{target.label}</strong>
                  {target.context ? <span>{target.context}</span> : null}
                </dt>
                <dd>{formatTargetRange(target)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="build-analysis__empty-copy">No target stat ranges were supplied.</p>
        )
      ) : null}
    </EvidenceCard>
  );
}

function BuildQuality({ evidence }: { evidence: CharacterAnalysisResult["buildQuality"] }) {
  return (
    <EvidenceCard eyebrow="Analysis output" title="Build quality" evidence={evidence}>
      {evidence.state !== "unavailable" ? (
        <div className="build-analysis__outcome-value">
          <strong>{evidence.value.label}</strong>
          {evidence.value.normalizedScore !== undefined ? (
            <span>Normalized score: {evidence.value.normalizedScore}</span>
          ) : null}
        </div>
      ) : null}
    </EvidenceCard>
  );
}

function Recommendation({ evidence }: { evidence: CharacterAnalysisResult["recommendation"] }) {
  return (
    <EvidenceCard eyebrow="Analysis output" title="Recommendation" evidence={evidence}>
      {evidence.state !== "unavailable" ? (
        <div className="build-analysis__recommendation">
          <strong>{evidence.value.summary}</strong>
          {evidence.value.nextAction ? (
            <p>
              <span>Next action</span>
              {evidence.value.nextAction}
            </p>
          ) : null}
        </div>
      ) : null}
    </EvidenceCard>
  );
}

export function AnalysisOutcome({ targetStats, buildQuality, recommendation }: AnalysisOutcomeProps) {
  return (
    <section className="build-analysis__group" aria-labelledby="analysis-outcome-heading">
      <div className="build-analysis__group-heading">
        <div>
          <div className="build-analysis__eyebrow">Evidence-backed conclusions</div>
          <h2 id="analysis-outcome-heading">Analysis output</h2>
        </div>
        <p>Values and advice appear only when the canonical analysis contract supplies them.</p>
      </div>
      <div className="build-analysis__outcome-grid">
        <TargetStats evidence={targetStats} />
        <BuildQuality evidence={buildQuality} />
        <Recommendation evidence={recommendation} />
      </div>
    </section>
  );
}

export function BuildAnalysisPanel({ result, characterName }: BuildAnalysisPanelProps) {
  const heading = characterName ?? `Character ${result.characterId}`;

  return (
    <div className="build-analysis" data-character-id={result.characterId}>
      <header className="build-analysis__header">
        <div>
          <div className="build-analysis__eyebrow">Build analysis</div>
          <h1>{heading}</h1>
          <p>
            Evidence, provenance, community methodology, and unavailable states are kept explicit. This component does
            not calculate scores, targets, or recommendations.
          </p>
        </div>
        <div className="build-analysis__contract-note" role="note">
          <strong>Presentation only</strong>
          <span>All analysis values are rendered from CharacterAnalysisResult.</span>
        </div>
      </header>

      <ObservedBuildEvidence evidence={result.evidence} />
      <CommunityRelicScores relicScores={result.relicScores} />
      <AnalysisOutcome
        targetStats={result.evidence.targetStats}
        buildQuality={result.buildQuality}
        recommendation={result.recommendation}
      />
    </div>
  );
}
