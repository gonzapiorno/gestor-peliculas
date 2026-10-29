import { Link } from "react-router-dom";
import Icon from "../components/ui/Icon";
import "./CommunityPage.css";

export default function CommunityPage() {
  return (
    <main className="community-page page-container">
      <header className="page-heading">
        <p className="eyebrow">Próximamente</p>
        <h1 className="page-title">Comunidad y amigos</h1>
        <p className="page-description">Muy pronto vas a poder descubrir qué ven tus amigos y explorar sus colecciones.</p>
      </header>
      <section className="community-page__intro" aria-labelledby="community-coming-heading">
        <span className="community-page__icon"><Icon name="users" size={28} /></span>
        <h2 id="community-coming-heading">El cine se disfruta más juntos</h2>
        <p>Amigos, colecciones compartidas y reseñas, en un mismo lugar.</p>
        <Link className="button button--primary" to="/">Descubrir películas<Icon name="arrow-right" size={17} /></Link>
      </section>
    </main>
  );
}
