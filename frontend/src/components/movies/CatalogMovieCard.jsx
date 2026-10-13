import { Link } from "react-router-dom";
import "./CatalogMovieCard.css";

function CatalogMovieCard({ pelicula }) {
  return (
    <Link
      className="catalog-card"
      to={`/pelicula/${pelicula.id_tmdb}`}
    >
      {/* Poster obtenido desde TMDB */}
      <div className="catalog-card__poster">
        {pelicula.poster ? (
          <img
            src={pelicula.poster}
            alt={`Poster de ${pelicula.titulo}`}
          />
        ) : (
          <div className="catalog-card__sin-poster">
            Sin poster
          </div>
        )}
      </div>

      <div className="catalog-card__info">
        <h3>{pelicula.titulo}</h3>

        <div className="catalog-card__meta">
          <span>{pelicula.anio ?? "Sin año"}</span>
          <span>★ {pelicula.puntuacion}</span>
        </div>
      </div>
    </Link>
  );
}

export default CatalogMovieCard;