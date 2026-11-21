import { useId, useRef, useState } from "react";
import useMovieSearch from "../../hooks/useMovieSearch";
import { crearPublicacion } from "../../services/publicacionesApi";
import { errorMessage } from "../../utils/errorMessage";
import RatingSlider from "../movies/RatingSlider";
import Dialog from "../ui/Dialog";
import Icon from "../ui/Icon";
import Poster from "../ui/Poster";
import "../movies/RatingDialog.css";

export const LIMITE_TEXTO = 280;

export default function CommunityComposer({ onClose, onPublish }) {
  const id = useId();
  const busqueda = useMovieSearch();
  const campoBusqueda = useRef(null);
  const operacion = useRef(false);
  const [pelicula, setPelicula] = useState(null);
  const [estado, setEstado] = useState("viendo");
  const [nota, setNota] = useState(null);
  const [contenido, setContenido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const longitud = Array.from(contenido.trim()).length;

  async function publicar(event) {
    event.preventDefault();
    if (!pelicula || longitud > LIMITE_TEXTO || operacion.current) return;
    operacion.current = true;
    setGuardando(true);
    setError("");
    try {
      const publicacion = await crearPublicacion({
        id_tmdb: pelicula.id_tmdb,
        estado,
        contenido: contenido.trim(),
        puntuacion_personal: estado === "vista" ? nota : null,
      });
      onPublish(publicacion);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      operacion.current = false;
      setGuardando(false);
    }
  }

  return (
    <Dialog className="community-composer dialog--enter" title="Compartir película"
      description="Visible para tus amigos en Comunidad." busy={guardando} onClose={onClose}>
      <form className="community-composer__form" onSubmit={publicar}>
        <div>
          <label htmlFor={`${id}-movie`}>Película</label>
          <div className="search-field community-composer__search">
            <Icon name="search" size={17} />
            <input type="search" className="field-input" ref={campoBusqueda} id={`${id}-movie`}
              autoComplete="off" placeholder="Buscar por título…" value={busqueda.query} data-autofocus=""
              disabled={guardando} onChange={(event) => { setPelicula(null); busqueda.setQuery(event.target.value); }} />
          </div>
          {pelicula ? (
            <div className="community-composer__selected">
              <Icon name="check" size={17} /><span>{pelicula.titulo} {pelicula.anio && <small>{pelicula.anio}</small>}</span>
              <button type="button" className="button" disabled={guardando} onClick={() => {
                setPelicula(null);
                campoBusqueda.current?.focus();
              }}>Cambiar</button>
            </div>
          ) : busqueda.eligible && (
            <div className="community-composer__results">
              {busqueda.status === "loading" && <p role="status">Buscando películas…</p>}
              {busqueda.error && <div className="inline-error" role="alert">
                <span>{busqueda.error}</span><button className="button" type="button" onClick={busqueda.retry}>Reintentar</button>
              </div>}
              {busqueda.status === "success" && (busqueda.results.length ? (
                <ul>
                  {busqueda.results.slice(0, 8).map((item) => (
                    <li key={item.id_tmdb}><button type="button" onClick={() => setPelicula(item)}>
                      <span className="community-composer__poster" aria-hidden="true"><Poster src={item.poster} title={item.titulo} sizes="32px" /></span>
                      <span>{item.titulo}{item.anio && <small>{item.anio}</small>}</span>
                    </button></li>
                  ))}
                </ul>
              ) : <p role="status">No encontramos películas con ese título.</p>)}
            </div>
          )}
        </div>

        <fieldset className="community-composer__status" disabled={guardando}>
          <legend>Estado</legend>
          <div>
            <label><input type="radio" name={id} checked={estado === "viendo"} onChange={() => setEstado("viendo")} />
              <Icon name="film" size={16} />Estoy viendo</label>
            <label><input type="radio" name={id} checked={estado === "vista"} onChange={() => setEstado("vista")} />
              <Icon name="check" size={16} />Ya la vi</label>
          </div>
        </fieldset>
        {estado === "vista" && (
          <div className="community-composer__rating">
            <p>Tu puntuación <small>(opcional)</small></p>
            <RatingSlider nota={nota} onChange={setNota} disabled={guardando} />
            {nota != null && <button className="rating-dialog__clear" type="button" onClick={() => setNota(null)} disabled={guardando}>Quitar puntuación</button>}
          </div>
        )}
        <div>
          <label htmlFor={`${id}-content`}>Comentario <small>(opcional)</small></label>
          <textarea id={`${id}-content`} value={contenido} disabled={guardando} rows={3}
            aria-describedby={`${id}-count`} aria-invalid={longitud > LIMITE_TEXTO || undefined}
            onChange={(event) => setContenido(event.target.value)} />
          <p className="community-text-count" id={`${id}-count`}>{longitud} / {LIMITE_TEXTO}</p>
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="dialog__actions">
          <button type="button" className="button" disabled={guardando} onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary" disabled={guardando || !pelicula || longitud > LIMITE_TEXTO}>
            {guardando ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
