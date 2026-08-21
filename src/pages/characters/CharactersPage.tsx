import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { characters } from "../../data/mock";
import { usePublicProfile } from "../../profile/react/PublicProfileContext";
import type { PublicProfileCharacter } from "../../profile/contracts";
import type { BuildQueueStage, BuildStatus, CharacterSummary } from "../../types/models";
import "./characters.css";

type RoleFilter = "all" | CharacterSummary["role"];
type StatusFilter = "all" | BuildStatus;
type ElementFilter = "all" | string;
type SortKey = "priority" | "score" | "name" | "level";
type PublicSortKey = "name" | "level";

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

function MockCharacterCard({ character }: { character: CharacterSummary }) {
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

function PublicCharacterCard({ character }: { character: PublicProfileCharacter }) {
  return (
    <Link
      className="character-card"
      to={`/characters/${character.id}`}
      aria-label={`Open ${character.name} public profile details`}
    >
      <div className="character-card__topline">
        <div>
          <span className="character-card__element">{character.element ?? "Element unavailable"}</span>
          <h2>{character.name}</h2>
        </div>
        {character.iconUrl ? (
          <img
            src={character.iconUrl}
            alt=""
            width="52"
            height="52"
            style={{ objectFit: "contain" }}
          />
        ) : null}
      </div>

      <div className="character-card__meta" aria-label="Public character overview">
        <span>Lv. {character.level}</span>
        {character.path ? <span>{character.path}</span> : null}
        {character.eidolon !== undefined ? <span>E{character.eidolon}</span> : null}
      </div>

      <div className="character-card__footer">
        <span className="character-card__action">Public showcase data · open equipment and stats</span>
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  );
}

function PublicCharactersRoster({
  roster,
  uid,
  isStale,
}: {
  roster: readonly PublicProfileCharacter[];
  uid: string;
  isStale: boolean;
}) {
  const [search, setSearch] = useState("");
  const [element, setElement] = useState("all");
  const [path, setPath] = useState("all");
  const [sortBy, setSortBy] = useState<PublicSortKey>("level");

  const elements = useMemo(
    () => Array.from(new Set(roster.map((character) => character.element).filter((value): value is string => Boolean(value)))).sort(),
    [roster],
  );
  const paths = useMemo(
    () => Array.from(new Set(roster.map((character) => character.path).filter((value): value is string => Boolean(value)))).sort(),
    [roster],
  );

  const visibleCharacters = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = roster.filter((character) => {
      const matchesSearch = query.length === 0 || character.name.toLocaleLowerCase().includes(query);
      const matchesElement = element === "all" || character.element === element;
      const matchesPath = path === "all" || character.path === path;
      return matchesSearch && matchesElement && matchesPath;
    });

    return [...filtered].sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : b.level - a.level || a.name.localeCompare(b.name),
    );
  }, [element, path, roster, search, sortBy]);

  const hasActiveFilters = search.trim() !== "" || element !== "all" || path !== "all";
  const resetFilters = () => {
    setSearch("");
    setElement("all");
    setPath("all");
  };

  return (
    <section className="page characters-page">
      <header className="page-header characters-page__header">
        <div>
          <div className="eyebrow">Public showcase · UID {uid}</div>
          <h1>Characters</h1>
          <p className="muted">Showing only characters supplied by the active public UID snapshot. No build score or priority is inferred.</p>
        </div>
        <div className="characters-page__count" aria-live="polite">
          <strong>{visibleCharacters.length}</strong>
          <span>of {roster.length} visible</span>
        </div>
      </header>

      {isStale ? (
        <div className="roster-empty" role="status">
          <h2>Snapshot is stale</h2>
          <p className="muted">These are the last successful values for this UID. Refresh the provider from the Account page before treating them as current.</p>
          <Link to="/account">Open Account →</Link>
        </div>
      ) : null}

      <div className="roster-controls" aria-label="Public character roster controls">
        <label className="roster-controls__search">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search showcased characters"
          />
        </label>

        <label>
          <span>Element</span>
          <select value={element} onChange={(event) => setElement(event.target.value)}>
            <option value="all">All elements</option>
            {elements.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span>Path</span>
          <select value={path} onChange={(event) => setPath(event.target.value)}>
            <option value="all">All paths</option>
            {paths.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as PublicSortKey)}>
            <option value="level">Level</option>
            <option value="name">Name</option>
          </select>
        </label>

        <button className="roster-controls__reset" type="button" onClick={resetFilters} disabled={!hasActiveFilters}>
          Clear filters
        </button>
      </div>

      {visibleCharacters.length > 0 ? (
        <div className="character-grid">
          {visibleCharacters.map((character) => <PublicCharacterCard character={character} key={character.id} />)}
        </div>
      ) : (
        <div className="roster-empty" role="status">
          <div className="roster-empty__icon" aria-hidden="true">✦</div>
          <h2>No public characters match</h2>
          <p className="muted">Try a different name or clear one of the showcase filters.</p>
          <button type="button" onClick={resetFilters}>Reset filters</button>
        </div>
      )}
    </section>
  );
}

function MockCharactersRoster() {
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
          <div className="eyebrow">Planning preview · mock roster</div>
          <h1>Characters</h1>
          <p className="muted">Load a public UID from Account to replace this preview with the real public showcase roster.</p>
        </div>
        <div className="characters-page__count" aria-live="polite">
          <strong>{visibleCharacters.length}</strong>
          <span>of {characters.length} visible</span>
        </div>
      </header>

      <div className="roster-controls" aria-label="Character roster controls">
        <label className="roster-controls__search">
          <span>Search</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search characters" />
        </label>

        <label>
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as RoleFilter)}>
            {roleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label>
          <span>Build status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label>
          <span>Element</span>
          <select value={element} onChange={(event) => setElement(event.target.value)}>
            <option value="all">All elements</option>
            {elements.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
            {sortOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>

        <button className="roster-controls__reset" type="button" onClick={resetFilters} disabled={!hasActiveFilters}>
          Clear filters
        </button>
      </div>

      {visibleCharacters.length > 0 ? (
        <div className="character-grid">
          {visibleCharacters.map((character) => <MockCharacterCard character={character} key={character.id} />)}
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

export function CharactersPage() {
  const { snapshot, isStale } = usePublicProfile();

  if (snapshot) {
    return <PublicCharactersRoster roster={snapshot.characters} uid={snapshot.source.uid} isStale={isStale} />;
  }

  return <MockCharactersRoster />;
}
