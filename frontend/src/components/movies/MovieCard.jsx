import { Link } from "react-router-dom";

import Icon from "../ui/Icon";
import Poster from "../ui/Poster";
import "./MovieCard.css";

function formatRating(value) {
  return Number(value).toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

function MovieCard({
  pelicula,
  onCambiarEstado,
  onCambiarFavorita,
  onCambiarPuntuacion,
  onEliminar,
  actualizando = false,
}) {
  const vista = pelicula.estado === "vista";
  const tienePuntuacion = pelicula.puntuacion_personal != null;
  const detalle = `/pelicula/${pelicula.id_tmdb}`;

  return (
    <article className="movie-card" aria-busy={actualizando}>
      <div className="movie-card__poster">
        <Link
          className="movie-card__poster-link"
          to={detalle}
          aria-label={`Ver detalles de ${pelicula.titulo}`}
        >
          <Poster src={pelicula.poster} title={pelicula.titulo} loading="lazy" />
        </Link>

        <button
          className={`movie-card__favorite${pelicula.favorita ? " is-favorite" : ""}`}
          type="button"
          onClick={() => onCambiarFavorita(pelicula)}
          disabled={actualizando}
          aria-pressed={pelicula.favorita}
          aria-label={`${pelicula.favorita ? "Quitar" : "Agregar"} ${pelicula.titulo} ${pelicula.favorita ? "de" : "a"} favoritas`}
          title={pelicula.favorita ? "Quitar de favoritas" : "Agregar a favoritas"}
        >
          <Icon name="heart" size={17} />
        </button>
      </div>

      <div className="movie-card__info">
        <h2 className="movie-card__title">
          <Link to={detalle} title={pelicula.titulo}>{pelicula.titulo}</Link>
        </h2>

        <div className="movie-card__meta">
          <span>{pelicula.anio || "Año no disponible"}</span>
          {actualizando && (
            <span className="movie-card__saving" role="status">
              <Icon name="refresh" size={11} /> Guardando…
            </span>
          )}
        </div>

        <div className="movie-card__personal">
          <button
            className={`movie-card__status${vista ? " is-watched" : ""}`}
            type="button"
            onClick={() => onCambiarEstado(pelicula)}
            disabled={actualizando}
            aria-label={`Marcar ${pelicula.titulo} como ${vista ? "pendiente" : "vista"}`}
            title={vista ? "Marcar como pendiente" : "Marcar como vista"}
          >
            <Icon name={vista ? "check" : "clock"} size={14} />
            {vista ? "Vista" : "Pendiente"}
          </button>

          <button
            className={`movie-card__rating${tienePuntuacion ? " has-rating" : ""}`}
            type="button"
            disabled={actualizando}
            onClick={() => onCambiarPuntuacion(pelicula)}
            aria-label={`Editar puntuación de ${pelicula.titulo}: ${tienePuntuacion ? `${formatRating(pelicula.puntuacion_personal)} sobre 10` : "sin puntuar"}`}
          >
            {tienePuntuacion
              ? <>Tu puntuación <strong>{formatRating(pelicula.puntuacion_personal)} / 10</strong></>
              : "Sin puntuar"}
          </button>
        </div>

        <div className="movie-card__actions">
          <button
            className="movie-card__remove"
            type="button"
            disabled={actualizando}
            onClick={() => onEliminar(pelicula)}
            aria-label={`Eliminar ${pelicula.titulo} de mi colección`}
          >
            <Icon name="trash" size={12} /> Quitar
          </button>
        </div>
      </div>
    </article>
  );
}

export default MovieCard;
