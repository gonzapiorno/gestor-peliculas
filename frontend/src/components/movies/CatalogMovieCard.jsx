import { Link } from "react-router-dom";
import Poster from "../ui/Poster";
import "./CatalogMovieCard.css";

function CatalogMovieCard({ pelicula }) {
  const puntuacion = Number.isFinite(pelicula.puntuacion)
    ? pelicula.puntuacion.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : null;

  return (
    <article className="catalog-card">
      <Link className="catalog-card__link" to={`/pelicula/${pelicula.id_tmdb}`}>
        <div className="catalog-card__poster">
          <Poster src={pelicula.poster} title={pelicula.titulo} loading="lazy" />
          <span className="catalog-card__open" aria-hidden="true">Ver película</span>
        </div>
        <div className="catalog-card__info">
          <h3>{pelicula.titulo}</h3>
          <div className="catalog-card__meta">
            <span>{pelicula.anio || "Sin año"}</span>
            <span className="catalog-card__rating">{puntuacion ? `Catálogo ${puntuacion} / 10` : "Sin valoración"}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default CatalogMovieCard;