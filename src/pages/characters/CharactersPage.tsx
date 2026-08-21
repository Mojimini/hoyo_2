import { Link } from "react-router-dom";
import { characters } from "../../data/mock";

export function CharactersPage() {
  return (
    <section className="page">
      <header className="page-header"><div><div className="eyebrow">Roster</div><h1>Characters</h1><p className="muted">Browse, filter, and compare build readiness.</p></div></header>
      <div className="grid">
        {characters.map((character) => (
          <Link className="card" to={`/characters/${character.id}`} key={character.id}>
            <strong>{character.name}</strong>
            <div className="muted">Lv.{character.level} · {character.role} · {character.buildScore}%</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
