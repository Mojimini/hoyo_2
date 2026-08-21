import { Link, useParams } from "react-router-dom";
import { characters } from "../../data/mock";

export function CharacterDetailPage() {
  const { id } = useParams();
  const character = characters.find((item) => item.id === id);
  if (!character) return <section className="page"><h1>Character not found</h1><Link to="/characters">Back to characters</Link></section>;

  return (
    <section className="page">
      <header className="page-header"><div><div className="eyebrow">Character analysis</div><h1>{character.name}</h1><p className="muted">Lv.{character.level} · {character.role} · Build {character.buildScore}%</p></div></header>
      <div className="card"><h2>Next best upgrade</h2><p>{character.nextAction}</p></div>
    </section>
  );
}
