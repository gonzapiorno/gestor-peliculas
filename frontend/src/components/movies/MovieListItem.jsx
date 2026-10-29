import { useRef } from "react";
import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import Poster from "../ui/Poster";
import useMovieMetadata from "../../hooks/useMovieMetadata";
import "./MovieListItem.css";

export default function MovieListItem({ pelicula, onCambiarEstado, onCambiarFavorita, onCambiarPuntuacion, onEliminar, actualizando = false }) {
  const targetRef = useRef(null);
  const metadata = useMovieMetadata(pelicula.id_tmdb, targetRef);
  const vista = pelicula.estado === "vista";
  const tieneNota = typeof pelicula.puntuacion_personal === "number" && Number.isFinite(pelicula.puntuacion_personal);
  const nota = tieneNota ? pelicula.puntuacion_personal.toLocaleString("es-AR", { maximumFractionDigits: 1 }) : null;
  const detalle = `/coleccion/${pelicula.id}`;
  const generos = metadata.data?.generos.slice(0, 3).join(" · ");

  return (
    <article className="movie-list-item" ref={targetRef}>
      <Link to={detalle} className="movie-list-item__poster" aria-label={`Ver detalles de ${pelicula.titulo}`}><Poster src={pelicula.poster} title={pelicula.titulo} loading="lazy" /></Link>
      <div className="movie-list-item__content">
        <div className="movie-list-item__heading">
          <h2><Link to={detalle}>{pelicula.titulo}</Link></h2>
          <button className={`movie-list-item__favorite${pelicula.favorita ? " is-favorite" : ""}`} type="button" disabled={actualizando} aria-pressed={pelicula.favorita} aria-label={`${pelicula.favorita ? "Quitar" : "Agregar"} ${pelicula.titulo} ${pelicula.favorita ? "de" : "a"} favoritas`} title={pelicula.favorita ? "Quitar de favoritas" : "Agregar a favoritas"} onClick={() => onCambiarFavorita(pelicula)}><Icon name="heart" size={19} /></button>
        </div>
        <div className="movie-list-item__metadata">
          <span>{pelicula.anio || "Año no disponible"}</span>
          {generos && <span>{generos}</span>}
          {metadata.data?.duracion && <span><Icon name="clock" size={13} /> {metadata.data.duracion} min</span>}
        </div>

        {metadata.status === "success" && <p className="movie-list-item__synopsis">{metadata.data.sinopsis || "Sin sinopsis disponible."}</p>}
        {["queued", "loading"].includes(metadata.status) && <p className="movie-list-item__loading" role="status"><Icon name="refresh" size={14} /> Cargando información…</p>}
        {metadata.status === "idle" && <button className="movie-list-item__load" type="button" onClick={metadata.load}>Ver sinopsis y duración</button>}
        {metadata.status === "error" && <div className="movie-list-item__metadata-error"><p role="alert">{metadata.error}</p><button type="button" onClick={metadata.retry}>Reintentar información</button></div>}
      </div>
        <div className="movie-list-item__actions">
          <button className={`movie-list-item__status${vista ? " is-watched" : ""}`} type="button" disabled={actualizando} aria-label={`Marcar ${pelicula.titulo} como ${vista ? "pendiente" : "vista"}`} onClick={() => onCambiarEstado(pelicula)}><Icon name={vista ? "check" : "clock"} size={15} />{vista ? "Vista" : "Pendiente"}</button>
          <button className={`movie-list-item__rating${tieneNota ? " has-rating" : ""}`} type="button" disabled={actualizando} aria-label={`Editar puntuación de ${pelicula.titulo}: ${tieneNota ? `${nota} sobre 10` : "sin puntuar"}`} onClick={() => onCambiarPuntuacion(pelicula)}><Icon name="star" size={15} />{tieneNota ? <>Tu nota <strong>{nota} / 10</strong></> : "Sin puntuar"}</button>
          <button className="movie-list-item__remove" type="button" disabled={actualizando} aria-label={`Eliminar ${pelicula.titulo} de mi colección`} title="Quitar de mi colección" onClick={() => onEliminar(pelicula)}><Icon name="trash" size={16} /><span>Quitar</span></button>
          {actualizando ? <span className="movie-list-item__saving" role="status">Guardando…</span> : <Link className="movie-list-item__detail" to={detalle}>Ver detalle <Icon name="arrow-right" size={15} /></Link>}
        </div>
    </article>
  );
}
