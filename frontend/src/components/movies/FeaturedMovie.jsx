import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerDetallePelicula } from "../../services/catalogoApi";
import Icon from "../ui/Icon";
import Poster from "../ui/Poster";
import "./FeaturedMovie.css";

export default function FeaturedMovie({ pelicula, coleccion }) {
  const [detalle, setDetalle] = useState(null);
  const requestRef = useRef(null);
  const id = Number(pelicula.id_tmdb);

  useEffect(() => {
    let vigente = true;
    if (requestRef.current?.id !== id) requestRef.current = { id, promise: obtenerDetallePelicula(id) };
    requestRef.current.promise.then((datos) => { if (vigente) setDetalle(datos); }).catch(() => {
      // El destacado sigue siendo útil con título, póster y nota del catálogo.
    });
    return () => { vigente = false; };
  }, [id]);

  const info = detalle?.id_tmdb === id ? detalle : null;
  const guardada = coleccion.guardadas.has(id);
  const guardando = coleccion.guardandoIds.has(id);
  const comprobando = coleccion.estadoColeccion === "loading";
  const falloComprobacion = coleccion.estadoColeccion === "error";
  const error = coleccion.errores.get(id);
  const generos = Array.isArray(info?.generos) ? info.generos.slice(0, 2) : [];
  const puntuacion = Number.isFinite(pelicula.puntuacion)
    ? pelicula.puntuacion.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })
    : null;

  return (
    <>
    <section className="featured-movie" aria-labelledby="featured-title">
      <div className="featured-movie__art" aria-hidden="true"><Poster src={pelicula.poster} title={pelicula.titulo} loading="eager" /></div>
      <div className="featured-movie__content">
        <div className="featured-movie__meta">
          <span className="featured-movie__label">Entre los populares</span>
          {puntuacion && <span className="featured-movie__score" aria-label={`Puntuación TMDB: ${puntuacion} sobre 10`}><Icon name="star" size={14} />{puntuacion}<span>TMDB / 10</span></span>}
        </div>
        <h2 id="featured-title" title={pelicula.titulo}>{pelicula.titulo}</h2>
        <p className="featured-movie__facts">
          {pelicula.anio && <span>{pelicula.anio}</span>}
          {generos.length > 0 && <span>{generos.join(" · ")}</span>}
          {info?.duracion > 0 && <span>{info.duracion} min</span>}
        </p>
        {info?.sinopsis && <p className="featured-movie__synopsis">{info.sinopsis}</p>}
        <div className="featured-movie__actions">
          <button className="button button--primary" type="button" disabled={guardada || guardando || comprobando || falloComprobacion} onClick={() => coleccion.agregar(pelicula)}>
            <Icon name={guardada ? "check" : guardando || comprobando ? "refresh" : "plus"} size={17} />
            {guardada ? "En mi colección" : guardando ? "Agregando…" : comprobando ? "Comprobando…" : falloComprobacion ? "Colección no disponible" : "Agregar a mi colección"}
          </button>
          <Link className="button featured-movie__details" to={`/pelicula/${id}`}>Ver película<Icon name="arrow-right" size={16} /></Link>
        </div>
      </div>
    </section>
    {error && !guardada && <p className="featured-movie__error">{error}. Podés volver a intentar.</p>}
    </>
  );
}
