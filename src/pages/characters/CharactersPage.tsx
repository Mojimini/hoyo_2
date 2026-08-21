import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { characters } from "../../data/mock";
import type { BuildQueueStage, BuildStatus, CharacterSummary } from "../../types/models";
import "./characters.css";

type RoleFilter = "all" | CharacterSummary["role"];
type StatusFilter = "all" | BuildStatus;
type ElementFilter = "all" | string;
type SortKey = "priority" | "score" | "name" | "level";

const roleOptions: Array<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "All roles" },
  { value: "DPS", label: "DPS" },
  { value: "Support", label: "Support" },
  { value: "Sustain", label: "Sustain" },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All build states" },
  { value: "needs-work", label: "Needs work" },
  { value: "good", label: "Good" },
  { value: "recommended", label: "Recommended" },
  { value: "complete", label: "Complete" },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "priority", label: "Build priority" },
  { value: "score", label: "Build score" },
  { value: "name", label: "Name" },
  { value: "level", label: "Level" },
];

const statusLabels: Record<BuildStatus, string> = {
  "needs-work": "Needs work",
  good: "Good",
  recommended: "Recommended",
  complete: "Complete",
};

const queueLabels: Record<BuildQueueStage, string> = {
  current: "Building now",
  next: "Build next",
  later: "Build later",
  done: "Queue complete",
};

function CharacterCard({ character }: { character: CharacterSummary }) {
  return (
    <Link
      className="character-card"
      to={`/characters/${character.id}`}
      aria-label={`Open ${character.name} build details`}
    >
      <div className="character-card__topline">
        <div>
          <span className="character-card__element">{character.element}</span>
          <h2>{character.name}</h2>
        </div>
        <span className={`status-pill status-pill--${character.status}`}>
          {statusLabels[character.status]}
        </span>
      </div>

      <div className="character-card__meta" aria-label="Character overview">
        <span>Lv. {character.level}</span>
        <span>{character.role}</span>
        <span>{character.element}</span>
      </div>

      <div className="character-card__score-row">
        <div>
          <span className="character-card__label">Build score</span>
          <strong>{character.buildScore}</strong>
        </div>
        <div>
          <span className="character-card__label">Priority</span>
          <strong>{character.priority}</strong>
        </div>
      </div>

      <div className="character-card__progress" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(character.buildScore, 100))}%` }} />
      </div>

      <div className="character-card__footer">
        <span className={`queue-pill queue-pill--${character.queueStage}`}>
          {queueLabels[character.queueStage]}
        </span>
        <span className="character-card__action">{character.nextAction}</span>
      </div>
    </Link>
  );
}

export function CharactersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [element, setElement] = useState<ElementFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("priority");

  const elements = useMemo(
    () => Array.from(new Set(characters.map((character) => character.element))).sort(),
    [],
  );

  const visibleCharacters = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    const filtered = characters.filter((character) => {
      const matchesSearch = query.length === 0 || character.name.toLocaleLowerCase().includes(query);
      const matchesRole = role === "all" || character.role === role;
      const matchesStatus = status === "all" || character.status === status;
      const matchesElement = element === "all" || character.element === element;

      return matchesSearch && matchesRole && matchesStatus && matchesElement;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.buildScore - a.buildScore || a.name.localeCompare(b.name);
        case "name":
          return a.name.localeCompare(b.name);
        case "level":
          return b.level - a.level || a.name.localeCompare(b.name);
        case "priority":
        default:
          return b.priority - a.priority || b.buildScore - a.buildScore || a.name.localeCompare(b.name);
      }
    });
  }, [element, role, search, sortBy, status]);

  const hasActiveFilters = search.trim() !== "" || role !== "all" || status !== "all" || element !== "all";

  function resetFilters() {
    setSearch("");
    setRole("all");
    setStatus("all");
    setElement("all");
  }

  return (
    <section className="page characters-page">
      <header className="page-header characters-page__header">
        <div>
          <div className="eyebrow">Roster</div>
          <h1>Characters</h1>
          <p className="muted">Find who is ready, who needs work, and who should be built next.</p>
        </div>
        <div className="characters-page__count" aria-live="polite">
          <strong>{visibleCharacters.length}</strong>
          <span>of {characters.length} visible</span>
        </div>
      </header>

      <div className="roster-controls" aria-label="Character roster controls">
        <label className="roster-controls__search">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search characters"
          />
        </label>

        <label>
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as RoleFilter)}>
            {roleOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Build status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            {statusOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Element</span>
          <select value={element} onChange={(event) => setElement(event.target.value)}>
            <option value="all">All elements</option>
            {elements.map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
            {sortOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button
          className="roster-controls__reset"
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </button>
      </div>

      {visibleCharacters.length > 0 ? (
        <div className="character-grid">
          {visibleCharacters.map((character) => (
            <CharacterCard character={character} key={character.id} />
          ))}
        </div>
      ) : (
        <div className="roster-empty" role="status">
          <div className="roster-empty__icon" aria-hidden="true">✦</div>
          <h2>No characters match</h2>
          <p className="muted">Try a different name or clear one of the roster filters.</p>
          <button type="button" onClick={resetFilters}>Reset filters</button>
        </div>
      )}
    </section>
  );
}
