import { useId } from "react";
import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import Poster from "../ui/Poster";
import "./CatalogMovieCard.css";

function CatalogMovieCard({
  pelicula,
  guardada = false,
  comprobando = false,
  comprobacionFallida = false,
  guardando = false,
  error = null,
  onAgregar,
}) {
  const errorId = useId();
  const puntuacion = Number.isFinite(pelicula.puntuacion)
    ? pelicula.puntuacion.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : null;
  const detalle = `/pelicula/${pelicula.id_tmdb}`;
  const ocupado = !guardada && (guardando || comprobando);
  const errorAccion = guardada ? null : error;
  const fallo = !guardada && (Boolean(errorAccion) || comprobacionFallida);
  const deshabilitado = guardada || ocupado || comprobacionFallida || !onAgregar;
  const accionVisible = guardada || ocupado || fallo;
  const etiqueta = guardada
    ? `${pelicula.titulo} ya está en tu colección`
    : guardando
      ? `Agregando ${pelicula.titulo} a mi colección`
      : comprobando
        ? `Comprobando si ${pelicula.titulo} está en tu colección`
        : comprobacionFallida
          ? `No se pudo comprobar si ${pelicula.titulo} está en tu colección`
          : errorAccion
            ? `Reintentar agregar ${pelicula.titulo}`
            : `Agregar ${pelicula.titulo} a mi colección`;
  const icono = guardada ? "bookmark" : ocupado ? "refresh" : comprobacionFallida ? "alert" : "plus";

  return (
    <article className="catalog-card">
      <div className="catalog-card__poster-slot">
        <Link className="catalog-card__link" to={detalle} aria-label={`Ver detalles de ${pelicula.titulo}`}>
          <div className="catalog-card__poster">
            <Poster src={pelicula.poster} title={pelicula.titulo} loading="lazy" />
            <span className="catalog-card__open" aria-hidden="true">Ver película</span>
          </div>
        </Link>
        {puntuacion && <span className="catalog-card__score" aria-label={`Puntuación TMDB: ${puntuacion} sobre 10`} title={`TMDB: ${puntuacion} / 10`}><Icon name="star" size={12} /><span>{puntuacion}</span></span>}
        <button
          className={`catalog-card__collection-action${accionVisible ? " is-visible" : ""}${guardada ? " is-saved" : ""}${ocupado ? " is-pending" : ""}${fallo ? " is-error" : ""}`}
          type="button"
          disabled={deshabilitado}
          aria-label={etiqueta}
          title={etiqueta}
          aria-busy={ocupado}
          aria-describedby={errorAccion ? errorId : undefined}
          onClick={() => onAgregar?.(pelicula)}
        >
          <Icon name={icono} size={18} />
        </button>
      </div>
      <div className="catalog-card__info">
        <h3><Link className="catalog-card__title-link" to={detalle}>{pelicula.titulo}</Link></h3>
        <div className="catalog-card__meta">
          <span>{pelicula.anio || "Sin año"}</span>
          <span className="catalog-card__rating">{puntuacion ? "TMDB / 10" : "Sin valoración"}</span>
        </div>
        {errorAccion && (
          <p className="catalog-card__error" id={errorId} role="alert">
            {errorAccion}. Reintentá con el botón +.
          </p>
        )}
      </div>
    </article>
  );
}

export default CatalogMovieCard;
