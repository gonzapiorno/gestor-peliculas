import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import MovieGrid from "../components/movies/MovieGrid";
import RatingDialog from "../components/movies/RatingDialog";
import Dialog from "../components/ui/Dialog";
import Icon from "../components/ui/Icon";
import PageState, { MovieSkeleton } from "../components/ui/PageState";
import {
  obtenerColeccion,
  actualizarEstado,
  actualizarFavorita,
  actualizarPuntuacion,
  eliminarDeColeccion,
} from "../services/coleccionApi";
import "./CollectionPage.css";
import { errorMessage } from "../utils/errorMessage";
import { COLLECTION_CHANGED_EVENT } from "../utils/collectionEvents";

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "vistas", label: "Vistas", icon: "check" },
  { id: "pendientes", label: "Pendientes", icon: "clock" },
  { id: "favoritas", label: "Favoritas", icon: "heart" },
];
const RATING_FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "alta", label: "9–10" },
  { id: "media", label: "7–8,5" },
  { id: "baja", label: "1–6,5" },
  { id: "sin", label: "Sin puntuar" },
];

function normalizeTitle(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function matchesRating(movie, filter) {
  const rating = movie.puntuacion_personal;
  if (filter === "todas") return true;
  if (filter === "sin") return rating == null;
  if (rating == null) return false;
  if (filter === "alta") return Number(rating) >= 9;
  if (filter === "media") return Number(rating) >= 7 && Number(rating) < 9;
  return Number(rating) < 7;
}

function CollectionPage() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorCambio, setErrorCambio] = useState(null);
  const [actualizandoIds, setActualizandoIds] = useState(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [filtroNota, setFiltroNota] = useState("todas");
  const [orden, setOrden] = useState("recientes");
  const [peliculaPuntuacion, setPeliculaPuntuacion] = useState(null);
  const [peliculaEliminar, setPeliculaEliminar] = useState(null);
  const [anuncio, setAnuncio] = useState("");
  const [intentoCarga, setIntentoCarga] = useState(0);
  // El bloqueo es síncrono: también evita dos clics antes del siguiente render.
  const guardandoRef = useRef(new Set());

  function reintentarCarga() {
    setCargando(true);
    setError(null);
    setIntentoCarga((anterior) => anterior + 1);
  }

  useEffect(() => {
    let vigente = true;
    obtenerColeccion()
      .then((datos) => { if (vigente) setPeliculas(datos); })
      .catch((cause) => { if (vigente) setError(errorMessage(cause)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [intentoCarga]);

  useEffect(() => {
    function refrescarColeccion() {
      setError(null);
      setCargando(true);
      setIntentoCarga((anterior) => anterior + 1);
    }
    window.addEventListener(COLLECTION_CHANGED_EVENT, refrescarColeccion);
    return () => window.removeEventListener(COLLECTION_CHANGED_EVENT, refrescarColeccion);
  }, []);

  const cantidades = useMemo(() => ({
    todas: peliculas.length,
    vistas: peliculas.filter((pelicula) => pelicula.estado === "vista").length,
    pendientes: peliculas.filter((pelicula) => pelicula.estado !== "vista").length,
    favoritas: peliculas.filter((pelicula) => pelicula.favorita).length,
  }), [peliculas]);

  const visibles = useMemo(() => {
    const consulta = normalizeTitle(busqueda.trim());
    return peliculas.filter((pelicula) => {
      const coincideFiltro = filtro === "todas"
        || (filtro === "vistas" && pelicula.estado === "vista")
        || (filtro === "pendientes" && pelicula.estado !== "vista")
        || (filtro === "favoritas" && pelicula.favorita);
      return coincideFiltro
        && normalizeTitle(pelicula.titulo).includes(consulta)
        && matchesRating(pelicula, filtroNota);
    }).sort((a, b) => {
      if (orden === "titulo") return a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" });
      if (orden === "anio") return (Number(b.anio) || 0) - (Number(a.anio) || 0) || b.id - a.id;
      if (orden === "puntuacion") return (Number(b.puntuacion_personal ?? -1)) - (Number(a.puntuacion_personal ?? -1)) || b.id - a.id;
      return b.id - a.id;
    });
  }, [peliculas, busqueda, filtro, filtroNota, orden]);

  async function guardarCambio(pelicula, tipo, valor) {
    const id = pelicula.id;
    if (guardandoRef.current.has(id)) return false;
    guardandoRef.current.add(id);
    setActualizandoIds(new Set(guardandoRef.current));
    setErrorCambio(null);
    setAnuncio("");

    try {
      let cambios;
      let mensaje;
      if (tipo === "estado") {
        const resultado = await actualizarEstado(id, valor);
        cambios = { estado: resultado.estado ?? valor };
        mensaje = `${pelicula.titulo}: marcada como ${cambios.estado}.`;
      } else if (tipo === "favorita") {
        const resultado = await actualizarFavorita(id, valor);
        cambios = { favorita: resultado.favorita ?? valor };
        mensaje = `${pelicula.titulo}: ${cambios.favorita ? "agregada a" : "quitada de"} favoritas.`;
      } else if (tipo === "puntuacion") {
        const resultado = await actualizarPuntuacion(id, valor);
        cambios = { puntuacion_personal: resultado.puntuacion_personal };
        mensaje = `${pelicula.titulo}: ${valor == null ? "puntuación quitada" : "puntuación guardada"}.`;
      } else {
        await eliminarDeColeccion(id);
        mensaje = `${pelicula.titulo}: eliminada de tu colección.`;
      }

      setPeliculas((anteriores) => tipo === "eliminar"
        ? anteriores.filter((item) => item.id !== id)
        : anteriores.map((item) => item.id === id ? { ...item, ...cambios } : item));
      setAnuncio(mensaje);
      return true;
    } catch (cause) {
      setErrorCambio({ mensaje: errorMessage(cause), pelicula, tipo, valor });
      return false;
    } finally {
      guardandoRef.current.delete(id);
      setActualizandoIds(new Set(guardandoRef.current));
    }
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltro("todas");
    setFiltroNota("todas");
  }

  const hayFiltros = busqueda.trim() || filtro !== "todas" || filtroNota !== "todas";
  const dialogAbierto = Boolean(peliculaPuntuacion || peliculaEliminar);

  return (
    <main className="collection-page page-container">
      <header className="page-heading">
        <p className="eyebrow">TU ARCHIVO PERSONAL</p>
        <h1 className="page-title">Mi colección</h1>
        <p className="page-description">Las historias que se quedan contigo. Y las que aún están por llegar.</p>
      </header>

      <p className="visually-hidden" role="status" aria-live="polite">{anuncio}</p>

      {error ? (
        <PageState kind="error" title="No pudimos abrir tu colección" description={`${error}. Comprobá la conexión e intentá de nuevo.`}>
          <button className="button" type="button" onClick={reintentarCarga}><Icon name="refresh" /> Reintentar</button>
        </PageState>
      ) : !cargando && peliculas.length === 0 ? (
        <PageState title="Tu historia de cine empieza acá" description="Guardá las películas que te inspiran. Acá vas a encontrar las que viste, tus favoritas y las que esperan su momento.">
          <Link className="button button--primary" to="/">Descubrir películas <Icon name="arrow-right" /></Link>
        </PageState>
      ) : (
        <>
          <div className="collection-controls">
            <div className="search-field collection-search">
              <Icon name="search" size={19} />
              <label htmlFor="collection-search" className="visually-hidden">Buscar en mi colección</label>
              <input
                className="field-input"
                id="collection-search"
                type="search"
                placeholder="Buscar en mi colección"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                disabled={cargando}
              />
              {busqueda && (
                <button className="icon-button" type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda"><Icon name="close" size={16} /></button>
              )}
            </div>

            <div className="collection-tabs" role="group" aria-label="Filtrar mi colección">
              {FILTERS.map((item) => (
                <button
                  className={`collection-tab${filtro === item.id ? " is-active" : ""}`}
                  type="button"
                  key={item.id}
                  aria-pressed={filtro === item.id}
                  onClick={() => setFiltro(item.id)}
                  disabled={cargando}
                >
                  {item.icon && <Icon name={item.icon} size={16} />}
                  <span>{item.label}</span>
                  <span className="collection-tab__count">· {cantidades[item.id]}</span>
                </button>
              ))}
            </div>

            <div className="collection-options">
              <div className="collection-ratings" role="group" aria-label="Filtrar por puntuación personal">
                <span className="collection-options__label">Tu puntuación</span>
                {RATING_FILTERS.map((item) => (
                  <button
                    className={`collection-rating-filter${filtroNota === item.id ? " is-active" : ""}`}
                    type="button"
                    key={item.id}
                    aria-pressed={filtroNota === item.id}
                    onClick={() => setFiltroNota(item.id)}
                    disabled={cargando}
                  >{item.label}</button>
                ))}
              </div>

              <div className="collection-sort">
                <label className="collection-options__label" htmlFor="collection-sort">Ordenar por:</label>
                <div className="collection-sort__select">
                  <select id="collection-sort" value={orden} onChange={(event) => setOrden(event.target.value)} disabled={cargando}>
                    <option value="recientes">Últimas añadidas</option>
                    <option value="titulo">Título: A–Z</option>
                    <option value="anio">Año: más recientes</option>
                    <option value="puntuacion">Tu puntuación: mayor</option>
                  </select>
                  <Icon name="chevron-down" size={14} />
                </div>
              </div>
            </div>
          </div>

          {!cargando && (
            <div className="collection-summary">
              <p role="status" aria-live="polite">
                {hayFiltros
                  ? `${visibles.length} de ${peliculas.length} películas`
                  : `${peliculas.length} ${peliculas.length === 1 ? "película" : "películas"} en tu colección`}
              </p>
              <span><Icon name="grid" size={15} /> Pósters</span>
            </div>
          )}

          {errorCambio && !dialogAbierto && (
            <div className="inline-error collection-error" role="alert">
              <span>{errorCambio.mensaje}.</span>
              <button type="button" onClick={() => guardarCambio(errorCambio.pelicula, errorCambio.tipo, errorCambio.valor)} disabled={actualizandoIds.has(errorCambio.pelicula.id)}>Reintentar</button>
              <button className="icon-button" type="button" aria-label="Cerrar mensaje de error" onClick={() => setErrorCambio(null)}><Icon name="close" size={16} /></button>
            </div>
          )}

          {cargando ? <MovieSkeleton count={4} /> : visibles.length > 0 ? (
            <MovieGrid
              peliculas={visibles}
              onCambiarEstado={(pelicula) => guardarCambio(pelicula, "estado", pelicula.estado === "vista" ? "pendiente" : "vista")}
              onCambiarFavorita={(pelicula) => guardarCambio(pelicula, "favorita", !pelicula.favorita)}
              onCambiarPuntuacion={(pelicula) => { setErrorCambio(null); setPeliculaPuntuacion(pelicula); }}
              onEliminar={(pelicula) => { setErrorCambio(null); setPeliculaEliminar(pelicula); }}
              actualizandoIds={actualizandoIds}
            />
          ) : (
            <PageState kind="search" title="Todavía no hay películas por acá" description="Probá con otro título o cambiá los filtros para volver a encontrar tus historias.">
              <button className="button" type="button" onClick={limpiarFiltros}>Limpiar búsqueda y filtros</button>
            </PageState>
          )}

          {!cargando && visibles.length > 0 && (
            <p className="collection-note"><Icon name="star" size={13} /> Tu puntuación es personal, sobre 10. Podés editarla pulsando la nota.</p>
          )}
        </>
      )}

      {peliculaPuntuacion && (
        <RatingDialog
          key={peliculaPuntuacion.id}
          pelicula={peliculaPuntuacion}
          onClose={() => setPeliculaPuntuacion(null)}
          onSave={(pelicula, nota) => guardarCambio(pelicula, "puntuacion", nota)}
          busy={actualizandoIds.has(peliculaPuntuacion.id)}
          error={errorCambio?.pelicula.id === peliculaPuntuacion.id ? errorCambio.mensaje : null}
        />
      )}

      {peliculaEliminar && (
        <Dialog
          title="¿Quitar de tu colección?"
          description={`Se eliminará «${peliculaEliminar.titulo}» junto con tu puntuación y su estado. Podés volver a agregarla desde Descubrir.`}
          onClose={() => setPeliculaEliminar(null)}
          busy={actualizandoIds.has(peliculaEliminar.id)}
        >
          {errorCambio?.pelicula.id === peliculaEliminar.id && <p className="inline-error" role="alert">{errorCambio.mensaje}.</p>}
          <div className="collection-delete-actions">
            <button className="button" type="button" data-autofocus onClick={() => setPeliculaEliminar(null)} disabled={actualizandoIds.has(peliculaEliminar.id)}>Conservar película</button>
            <button
              className="button button--danger"
              type="button"
              disabled={actualizandoIds.has(peliculaEliminar.id)}
              onClick={async () => {
                if (await guardarCambio(peliculaEliminar, "eliminar")) setPeliculaEliminar(null);
              }}
            >
              <Icon name="trash" size={16} />
              {actualizandoIds.has(peliculaEliminar.id) ? "Eliminando…" : "Quitar película"}
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

export default CollectionPage;
