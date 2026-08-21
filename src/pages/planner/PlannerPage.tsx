import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { characters } from "../../data/mock";
import type { BuildQueueStage, CharacterSummary } from "../../types/models";
import "./PlannerPage.css";

const stages: Array<{
  id: BuildQueueStage;
  label: string;
  description: string;
}> = [
  {
    id: "current",
    label: "Current",
    description: "The character receiving resources right now.",
  },
  {
    id: "next",
    label: "Next",
    description: "The immediate follow-up once the current build is ready.",
  },
  {
    id: "later",
    label: "Later",
    description: "Useful candidates that can wait for a future cycle.",
  },
  {
    id: "done",
    label: "Done",
    description: "Builds that are complete enough to leave the active queue.",
  },
];

const stageActions: Array<{ stage: BuildQueueStage; label: string }> = [
  { stage: "current", label: "Set Current" },
  { stage: "next", label: "Move Next" },
  { stage: "later", label: "Move Later" },
  { stage: "done", label: "Mark Done" },
];

function CharacterQueueItem({
  character,
  stage,
  onMove,
}: {
  character: CharacterSummary;
  stage: BuildQueueStage;
  onMove: (characterId: string, stage: BuildQueueStage) => void;
}) {
  return (
    <article className={`planner-item planner-item--${stage}`}>
      <div className="planner-item__topline">
        <div>
          <div className="planner-item__meta">
            <span>{character.role}</span>
            <span aria-hidden="true">•</span>
            <span>{character.element}</span>
          </div>
          <h3 className="planner-item__name">
            <Link to={`/characters/${character.id}`}>{character.name}</Link>
          </h3>
        </div>
        <div className="planner-score" aria-label={`Build score ${character.buildScore} out of 100`}>
          <span>{character.buildScore}</span>
          <small>/100</small>
        </div>
      </div>

      <div className="planner-item__metrics">
        <div>
          <span className="planner-label">Priority</span>
          <strong>{character.priority}</strong>
        </div>
        <div>
          <span className="planner-label">Readiness</span>
          <strong className={`planner-status planner-status--${character.status}`}>
            {character.status.replace("-", " ")}
          </strong>
        </div>
      </div>

      <div className="planner-next-action">
        <span className="planner-label">Next action</span>
        <p>{character.nextAction}</p>
      </div>

      <div className="planner-item__actions" aria-label={`Queue actions for ${character.name}`}>
        {stageActions
          .filter((action) => action.stage !== stage)
          .map((action) => (
            <button
              className="planner-action"
              type="button"
              key={action.stage}
              onClick={() => onMove(character.id, action.stage)}
            >
              {action.label}
            </button>
          ))}
      </div>
    </article>
  );
}

export function PlannerPage() {
  const [queueById, setQueueById] = useState<Record<string, BuildQueueStage>>(() =>
    Object.fromEntries(characters.map((character) => [character.id, character.queueStage])),
  );

  const charactersByStage = useMemo(
    () =>
      stages.reduce<Record<BuildQueueStage, CharacterSummary[]>>(
        (result, stage) => {
          result[stage.id] = characters.filter((character) => queueById[character.id] === stage.id);
          return result;
        },
        { current: [], next: [], later: [], done: [] },
      ),
    [queueById],
  );

  function moveCharacter(characterId: string, stage: BuildQueueStage) {
    setQueueById((current) => ({ ...current, [characterId]: stage }));
  }

  const currentCharacter = charactersByStage.current[0];

  return (
    <section className="page planner-page">
      <header className="page-header planner-header">
        <div>
          <div className="eyebrow">Build queue</div>
          <h1>Build Planner</h1>
          <p className="muted planner-header__copy">
            Keep one clear investment target, line up what comes next, and archive builds that are ready enough.
          </p>
        </div>
        <div className="planner-demo-note" role="note">
          Demo controls only — queue changes stay in local component state and reset when this page reloads.
        </div>
      </header>

      {currentCharacter ? (
        <section className="planner-current-spotlight" aria-labelledby="current-build-heading">
          <div>
            <div className="planner-current-spotlight__eyebrow">Current investment</div>
            <h2 id="current-build-heading">{currentCharacter.name}</h2>
            <p>{currentCharacter.nextAction}</p>
          </div>
          <div className="planner-current-spotlight__score">
            <span>{currentCharacter.buildScore}</span>
            <small>build score</small>
          </div>
          <Link className="planner-current-spotlight__link" to={`/characters/${currentCharacter.id}`}>
            Open build details
          </Link>
        </section>
      ) : (
        <section className="planner-current-spotlight planner-current-spotlight--empty">
          <div>
            <div className="planner-current-spotlight__eyebrow">Current investment</div>
            <h2>No active build</h2>
            <p>Choose any queued character and use “Set Current” to make the next target explicit.</p>
          </div>
        </section>
      )}

      <div className="planner-stage-list">
        {stages.map((stage, index) => {
          const stageCharacters = charactersByStage[stage.id];
          return (
            <section
              className={`planner-stage planner-stage--${stage.id}`}
              key={stage.id}
              aria-labelledby={`planner-stage-${stage.id}`}
            >
              <header className="planner-stage__header">
                <div className="planner-stage__step" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="planner-stage__title-row">
                    <h2 id={`planner-stage-${stage.id}`}>{stage.label}</h2>
                    <span>{stageCharacters.length}</span>
                  </div>
                  <p>{stage.description}</p>
                </div>
              </header>

              {stageCharacters.length > 0 ? (
                <div className="planner-stage__items">
                  {stageCharacters.map((character) => (
                    <CharacterQueueItem
                      key={character.id}
                      character={character}
                      stage={stage.id}
                      onMove={moveCharacter}
                    />
                  ))}
                </div>
              ) : (
                <div className="planner-empty-state">
                  <strong>Nothing here yet</strong>
                  <span>
                    {stage.id === "current"
                      ? "Set one queued character as the current investment target."
                      : `Move a character here when the ${stage.label.toLowerCase()} stage fits its plan.`}
                  </span>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
