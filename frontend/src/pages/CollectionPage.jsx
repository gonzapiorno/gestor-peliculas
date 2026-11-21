import useStartupReady from "../hooks/useStartupReady";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";

import MovieGrid from "../components/movies/MovieGrid";
import StatsCard from "../components/movies/StatsCard";
import ViewModeToggle from "../components/movies/ViewModeToggle";
import CollectionSortPicker from "../components/movies/CollectionSortPicker";
import { collectionStatistics } from "../components/movies/collectionStatistics";
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
import { useAuth } from "../auth/useAuth";
import { collectionView, rememberCollectionView, restoreCollectionPosition } from "../utils/collectionNavigation";

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

const VIEW_KEY = "muvis.collection.view";
const PAGE_SIZE = 24;
function preferredView() {
  try { return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; }
  catch { return "grid"; }
}

function CollectionPage() {
  const { key } = useLocation();
  const navigationType = useNavigationType();
  const { sessionKey } = useAuth();
  const [previousView] = useState(() => navigationType === "POP" ? collectionView(key, sessionKey) : undefined);
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  useStartupReady(!cargando);
  const [error, setError] = useState(null);
  const [errorCambio, setErrorCambio] = useState(null);
  const [actualizandoIds, setActualizandoIds] = useState(new Set());
  const [busqueda, setBusqueda] = useState(previousView?.busqueda ?? "");
  const [filtro, setFiltro] = useState(previousView?.filtro ?? "todas");
  const [filtroNota, setFiltroNota] = useState(previousView?.filtroNota ?? "todas");
  const [orden, setOrden] = useState(previousView?.orden ?? "recientes");
  const [cantidadVisible, setCantidadVisible] = useState(previousView?.cantidadVisible ?? PAGE_SIZE);
  const [vista, setVista] = useState(() => previousView?.vista ?? preferredView());
  const [peliculaPuntuacion, setPeliculaPuntuacion] = useState(null);
  const [peliculaEliminar, setPeliculaEliminar] = useState(null);
  const [anuncio, setAnuncio] = useState("");
  const [intentoCarga, setIntentoCarga] = useState(0);
  // El bloqueo es síncrono: también evita dos clics antes del siguiente render.
  const guardandoRef = useRef(new Set());
  const cargaRef = useRef(null);
  const filtrosNotaRef = useRef(null);
  const pageRef = useRef(null);
  const restoredRef = useRef(false);

  function rememberView(event, movieId) {
    rememberCollectionView(event, key, {
      sessionKey, busqueda, filtro, filtroNota, orden, vista, movieId, cantidadVisible,
    });
  }

  useLayoutEffect(() => {
    if (!previousView || restoredRef.current || cargando || error) return;
    restoredRef.current = true;
    restoreCollectionPosition(previousView, pageRef.current);
  }, [previousView, cargando, error]);

  function reintentarCarga() {
    setCargando(true);
    setError(null);
    setIntentoCarga((anterior) => anterior + 1);
  }

  useEffect(() => {
    let vigente = true;
    if (cargaRef.current?.intento !== intentoCarga) {
      cargaRef.current = { intento: intentoCarga, promesa: obtenerColeccion() };
    }
    cargaRef.current.promesa
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

  useEffect(() => {
    function cerrarFiltros(event) {
      const panel = filtrosNotaRef.current;
      if (panel?.open && !panel.contains(event.target)) panel.open = false;
    }
    document.addEventListener("pointerdown", cerrarFiltros);
    return () => document.removeEventListener("pointerdown", cerrarFiltros);
  }, []);

  const cantidades = useMemo(() => collectionStatistics(peliculas), [peliculas]);

  function cambiarVista(value) {
    if (filtrosNotaRef.current) filtrosNotaRef.current.open = false;
    setVista(value);
    try { window.localStorage.setItem(VIEW_KEY, value); } catch { /* La preferencia no requiere almacenamiento. */ }
  }

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
    setCantidadVisible(PAGE_SIZE);
  }

  const hayFiltros = busqueda.trim() || filtro !== "todas" || filtroNota !== "todas";
  const dialogAbierto = Boolean(peliculaPuntuacion || peliculaEliminar);

  return (
    <main className="collection-page page-container" ref={pageRef}>
      <header className="page-heading collection-heading">
        <div>
          <h1 className="page-title">Mi colección</h1>
          <p className="page-description">Las películas que viste y las que querés ver.</p>
        </div>
        <Link to="/" className="button button--primary"><Icon name="plus" size={15} /> Agregar películas</Link>
      </header>

      <p className="visually-hidden" role="status" aria-live="polite">{anuncio}</p>

      {!error && (
        <section className="collection-stats" aria-label="Estadísticas de tu colección">
          <StatsCard label="Películas guardadas" value={cantidades.todas} icon="library" loading={cargando} />
          <StatsCard label="Películas vistas" value={cantidades.vistas} icon="check" tone="secondary" loading={cargando} />
          <StatsCard label="Tu nota promedio" value={cantidades.promedio == null ? "—" : cantidades.promedio.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} icon="star" detail={cantidades.puntuadas ? `${cantidades.puntuadas} ${cantidades.puntuadas === 1 ? "puntuada" : "puntuadas"}` : "Sin notas"} tone="rating" loading={cargando} />
          <StatsCard label="Películas favoritas" value={cantidades.favoritas} icon="heart" loading={cargando} />
        </section>
      )}

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
            <div className="collection-tabs" role="group" aria-label="Filtrar mi colección">
              {FILTERS.map((item) => (
                <button
                  className={`collection-tab${filtro === item.id ? " is-active" : ""}`}
                  type="button"
                  key={item.id}
                  aria-pressed={filtro === item.id}
                  onClick={() => { setFiltro(item.id); setCantidadVisible(PAGE_SIZE); }}
                  disabled={cargando}
                >
                  <Icon name={item.icon || "grid"} size={14} />
                  <span>{item.label}</span>
                  <span className="collection-tab__count">{cantidades[item.id]}</span>
                </button>
              ))}
            </div>

            <div className="collection-toolbar">
              <div className="search-field collection-search">
                <Icon name="search" size={18} />
                <label htmlFor="collection-search" className="visually-hidden">Buscar en mi colección</label>
                <input className="field-input" id="collection-search" type="search" placeholder="Filtrar en mi colección…" value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setCantidadVisible(PAGE_SIZE); }} disabled={cargando} />
                {busqueda && <button className="icon-button" type="button" onClick={() => { setBusqueda(""); setCantidadVisible(PAGE_SIZE); }} aria-label="Limpiar búsqueda"><Icon name="close" size={16} /></button>}
              </div>

              <details ref={filtrosNotaRef} className="collection-ratings" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary").focus(); } }}>
                <summary><Icon name="sliders" size={16} /><span>{filtroNota === "todas" ? "Puntuación" : RATING_FILTERS.find((item) => item.id === filtroNota)?.label}</span><Icon name="chevron-down" size={13} /></summary>
                <div className="collection-ratings__panel" role="group" aria-label="Filtrar por puntuación personal">
                {RATING_FILTERS.map((item) => (
                  <button
                    className={`collection-rating-filter${filtroNota === item.id ? " is-active" : ""}`}
                    type="button"
                    key={item.id}
                    aria-pressed={filtroNota === item.id}
                    onClick={() => {
                      setFiltroNota(item.id);
                      setCantidadVisible(PAGE_SIZE);
                      if (filtrosNotaRef.current) {
                        filtrosNotaRef.current.open = false;
                        filtrosNotaRef.current.querySelector("summary").focus();
                      }
                    }}
                    disabled={cargando}
                  >{item.label}</button>
                ))}
                </div>
              </details>

              <CollectionSortPicker value={orden} onChange={(value) => { setOrden(value); setCantidadVisible(PAGE_SIZE); }} disabled={cargando}
                onOpen={() => { if (filtrosNotaRef.current) filtrosNotaRef.current.open = false; }} />
              <ViewModeToggle value={vista} onChange={cambiarVista} />
            </div>
          </div>

          {!cargando && (
            <div className="collection-summary">
              <p role="status" aria-live="polite">
                {hayFiltros
                  ? `${visibles.length} de ${peliculas.length} películas`
                  : `${peliculas.length} ${peliculas.length === 1 ? "película" : "películas"} en tu colección`}
              </p>
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
              onOpenDetail={rememberView}
              peliculas={visibles.slice(0, cantidadVisible)}
              viewMode={vista}
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

          {!cargando && visibles.length > PAGE_SIZE && (
            <div className="collection-more">
              {cantidadVisible < visibles.length && (
                <button className="button button--primary" type="button" onClick={() => setCantidadVisible((cantidad) => cantidad + PAGE_SIZE)}>
                  Cargar más<Icon name="chevron-down" size={15} />
                </button>
              )}
              <p role="status">Mostrando {Math.min(cantidadVisible, visibles.length)} de {visibles.length} películas</p>
            </div>
          )}

          {!cargando && visibles.length > 0 && (
            <p className="collection-note"><Icon name="star" size={13} /> Tus puntuaciones son personales, sobre 10.</p>
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
