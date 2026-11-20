import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import ProfileAvatar from "../components/account/ProfileAvatar";
import MovieDetailBackLink from "../components/movies/MovieDetailBackLink";
import CollectionSortPicker from "../components/movies/CollectionSortPicker";
import { collectionStatistics } from "../components/movies/collectionStatistics";
import Dialog from "../components/ui/Dialog";
import Icon from "../components/ui/Icon";
import PageState from "../components/ui/PageState";
import Poster from "../components/ui/Poster";
import { obtenerColeccionAmigo, obtenerPerfilAmigo, quitarAmistad } from "../services/amistadesApi";
import { obtenerColeccion } from "../services/coleccionApi";
import { collectionView, rememberCollectionView, restoreCollectionPosition } from "../utils/collectionNavigation";
import { errorMessage } from "../utils/errorMessage";
import "../components/account/ProfileFeaturedMovies.css";
import "./FriendProfilePage.css";

const formatoNota = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const formatoCantidad = new Intl.NumberFormat("es-AR");
const LIMITE_INICIAL = 12;
const FILTROS_INICIALES = { busqueda: "", orden: "recientes", todas: false };

function normalizarTitulo(titulo) {
  return titulo.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
}

function PeliculasDelAmigo({ peliculas, perfilId, enColeccion = false, recordarVista, notas, pendientesPropias }) {
  return (
    <ul className={`profile-featured__grid${enColeccion ? " friend-profile__watched-grid" : ""}`}>
      {peliculas.map((pelicula) => {
        const nota = enColeccion ? pelicula.puntuacion_personal : notas?.get(pelicula.id_tmdb);
        const pendienteEnComun = pendientesPropias?.has(pelicula.id_tmdb);
        return (
          <li key={pelicula.id_tmdb} data-collection-movie={pelicula.id_tmdb}>
            <Link className="profile-featured__slot" to={`/pelicula/${pelicula.id_tmdb}`}
              state={{ friendProfileId: perfilId, friendProfileCollection: enColeccion }}
              onClick={(event) => recordarVista(event, pelicula.id_tmdb, enColeccion)}>
              <span className="profile-featured__poster" aria-hidden="true">
                <Poster src={pelicula.poster} title={pelicula.titulo}
                  sizes={enColeccion ? "(max-width: 600px) 30vw, 160px" : "(max-width: 600px) 45vw, 200px"} />
                {pendienteEnComun && <span className="friend-profile__shared-pending">También la querés ver</span>}
              </span>
              <span className="profile-featured__title">{pelicula.titulo}</span>
              {pendienteEnComun && <span className="visually-hidden">También la querés ver</span>}
              {pelicula.anio && <span className="friend-profile__movie-year">{pelicula.anio}</span>}
              {nota != null && (
                <span className="friend-profile__rating">
                  <Icon name="star" size={13} />
                  <span className="visually-hidden">Puntuación personal </span>
                  {formatoNota.format(nota)}
                  <span className="visually-hidden"> de 10</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EstadisticasAmigo({ peliculas, vistasPropias }) {
  const { promedio } = collectionStatistics(peliculas);
  const coincidencias = vistasPropias || !peliculas.length
    ? peliculas.filter(({ id_tmdb }) => vistasPropias?.has(id_tmdb)).length : null;
  return (
    <dl className="friend-profile__stats">
      <div>
        <dt>Vistas</dt>
        <dd>{formatoCantidad.format(peliculas.length)}</dd>
      </div>
      <div className="friend-profile__average">
        <dt>Promedio</dt>
        <dd>{promedio === null
          ? <><span aria-hidden="true">—</span><span className="visually-hidden">Sin puntuaciones</span></>
          : <>{formatoNota.format(promedio)} <Icon name="star" size={15} /><span className="visually-hidden"> de 10</span></>}
        </dd>
      </div>
      <div>
        <dt>En común</dt>
        <dd>{coincidencias === null
          ? <><span aria-hidden="true">—</span><span className="visually-hidden">Dato no disponible</span></>
          : formatoCantidad.format(coincidencias)}
        </dd>
      </div>
    </dl>
  );
}

function ColeccionCompartida({ peliculas, perfilId, lista, vista, setVista, recordarVista, pendientesPropias, children }) {
  const buscador = useRef(null);
  const consulta = normalizarTitulo(vista.busqueda.trim());
  const filtradas = peliculas.filter(({ titulo }) => normalizarTitulo(titulo).includes(consulta));
  if (vista.orden === "puntuacion") filtradas.sort((a, b) => (b.puntuacion_personal ?? -1) - (a.puntuacion_personal ?? -1));
  if (vista.orden === "titulo") filtradas.sort((a, b) => a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" }));
  if (vista.orden === "anio") filtradas.sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0));
  const mostradas = vista.todas ? filtradas : filtradas.slice(0, LIMITE_INICIAL);

  return (
    <>
      <div className="friend-profile__filters">
        <div className="search-field friend-profile__search">
          <Icon name="search" size={17} />
          <input ref={buscador} className="field-input" type="search" aria-label={`Buscar en las películas ${lista}`}
            placeholder="Buscar por título…" value={vista.busqueda}
            onChange={(event) => setVista({ ...vista, busqueda: event.target.value })} />
          {vista.busqueda && (
            <button className="icon-button" type="button" aria-label="Limpiar búsqueda" onClick={() => {
              setVista({ ...vista, busqueda: "" });
              buscador.current?.focus();
            }}><Icon name="close" size={18} /></button>
          )}
        </div>
        <CollectionSortPicker value={vista.orden} conNotas={lista === "vistas"}
          onChange={(orden) => setVista({ ...vista, orden })} />
      </div>
      {children}
      {!peliculas.length ? <p className="friend-profile__message">
        {lista === "vistas" ? "Todavía no marcó películas como vistas." : "Todavía no tiene películas pendientes."}
      </p> : mostradas.length
        ? <PeliculasDelAmigo peliculas={mostradas} perfilId={perfilId} recordarVista={recordarVista}
            pendientesPropias={lista === "pendientes" ? pendientesPropias : null} enColeccion />
        : <p className="friend-profile__message" role="status">No encontramos películas con ese título.</p>}
      {mostradas.length < filtradas.length && (
        <button className="button friend-profile__show-all" type="button"
          onClick={() => setVista({ ...vista, todas: true })}>
          Ver todas las {formatoCantidad.format(filtradas.length)} películas <Icon name="chevron-down" size={16} />
        </button>
      )}
    </>
  );
}

function OpcionesAmistad({ onRemove }) {
  const ref = useRef(null);
  useEffect(() => {
    function cerrarFuera(event) {
      const menu = ref.current;
      if (menu && !menu.contains(event.target)) menu.open = false;
    }
    document.addEventListener("pointerdown", cerrarFuera);
    return () => document.removeEventListener("pointerdown", cerrarFuera);
  }, []);

  function cerrar() {
    ref.current.open = false;
    ref.current.querySelector("summary").focus({ preventScroll: true });
  }

  return (
    <details className="friend-profile__options" ref={ref}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cerrar(); } }}>
      <summary aria-label="Opciones de amistad" title="Opciones de amistad"><Icon name="dots" size={18} /></summary>
      <div className="friend-profile__options-panel">
        <button className="friend-profile__remove" type="button" onClick={() => { cerrar(); onRemove(); }}>
          <Icon name="users" size={15} />Quitar de amigos
        </button>
      </div>
    </details>
  );
}

function ConfirmarBaja({ perfil, onClose, onComplete }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const operacion = useRef(false);

  async function confirmar() {
    if (operacion.current) return;
    operacion.current = true;
    setOcupado(true);
    setError("");
    try {
      await quitarAmistad(perfil.id);
      onComplete();
    } catch (cause) {
      if (cause.status === 404) onComplete();
      else {
        setError(errorMessage(cause));
        setOcupado(false);
        operacion.current = false;
      }
    }
  }

  return (
    <Dialog className="friend-profile__confirmation dialog--enter" title={`¿Quitar a @${perfil.nombre_usuario} de tus amigos?`}
      description="Se cerrará el acceso mutuo a sus perfiles y colecciones compartidas."
      busy={ocupado} onClose={onClose}>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="dialog__actions">
        <button className="button" type="button" data-autofocus disabled={ocupado} onClick={onClose}>Cancelar</button>
        <button className="button button--danger" type="button" disabled={ocupado} onClick={confirmar}>
          {ocupado ? "Quitando…" : "Quitar de amigos"}
        </button>
      </div>
    </Dialog>
  );
}

function PerfilAmigo({ id }) {
  const { key, search, state } = useLocation();
  const navigate = useNavigate();
  const tipoNavegacion = useNavigationType();
  const { sessionKey } = useAuth();
  const [anterior] = useState(() => {
    const guardada = collectionView(key, sessionKey);
    return tipoNavegacion === "POP" && guardada?.perfilId === Number(id) ? guardada : null;
  });
  const [vista, setVista] = useState(() => anterior?.vista ?? { lista: "vistas" });
  const [propias, setPropias] = useState(null);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [intento, setIntento] = useState(0);
  const seccionDestacadas = useRef(null);
  const seccionColeccion = useRef(null);
  const solicitud = useRef(null);
  const idValido = /^\d+$/.test(id) && Number(id) > 0 && Number(id) <= 2_147_483_647;

  useEffect(() => {
    if (resultado?.perfil) document.title = `${resultado.perfil.nombre_visible || resultado.perfil.nombre_usuario} · Muvis`;
  }, [resultado]);

  useEffect(() => {
    if (!idValido) return;
    let vigente = true;
    if (solicitud.current?.intento !== intento) {
      const coleccion = obtenerColeccionAmigo(id).catch((error) => {
        if (error.status === 404) throw error;
        return { error };
      });
      // Renderiza el perfil y la cuadrícula juntos para restaurar la posición antes del primer cuadro.
      solicitud.current = { intento, promesa: Promise.all([obtenerPerfilAmigo(id), coleccion]) };
    }
    solicitud.current.promesa
      .then(([perfil, coleccion]) => { if (vigente) setResultado({ perfil, coleccion }); })
      .catch((error) => { if (vigente) setResultado({ error }); });
    return () => { vigente = false; };
  }, [id, idValido, intento]);

  useEffect(() => {
    const compartida = resultado?.coleccion;
    if (!compartida?.peliculas?.length && !compartida?.pendientes?.length) return;
    let vigente = true;
    obtenerColeccion().then((peliculas) => {
      if (!vigente) return;
      const vistas = new Set();
      const pendientes = new Set();
      for (const { estado, id_tmdb } of peliculas) {
        if (estado === "vista") vistas.add(id_tmdb);
        if (estado === "pendiente") pendientes.add(id_tmdb);
      }
      setPropias({ vistas, pendientes });
    }).catch(() => { if (vigente) setPropias(null); });
    return () => { vigente = false; };
  }, [resultado]);

  useLayoutEffect(() => {
    if (!resultado?.perfil) return;
    if (anterior) {
      const seccion = anterior.enColeccion ? seccionColeccion.current : seccionDestacadas.current;
      const grid = seccion?.querySelector(".profile-featured__grid");
      if (grid) restoreCollectionPosition(anterior, grid);
      else seccion?.scrollIntoView({ behavior: "instant" });
    } else if (new URLSearchParams(search).get("vista") === "coleccion") {
      seccionColeccion.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [anterior, resultado, search]);

  function recordarVista(event, movieId, enColeccion) {
    rememberCollectionView(event, key, { sessionKey, perfilId: Number(id), enColeccion, movieId, vista });
  }

  function reintentar() {
    setResultado(null);
    setIntento((valor) => valor + 1);
  }

  const volver = (
    <MovieDetailBackLink to="/comunidad" historyBack={state?.desdeComunidad === true}>
      Volver a Comunidad
    </MovieDetailBackLink>
  );
  const error = resultado?.error;
  const noDisponible = !idValido || error?.status === 404;

  if (noDisponible || error) {
    return (
      <main className="friend-profile page-container">
        {volver}
        <PageState
          kind="error"
          title={noDisponible ? "Perfil no disponible" : "No pudimos abrir el perfil"}
          description={noDisponible ? "Los perfiles están disponibles entre amigos." : errorMessage(error)}
        >
          {!noDisponible && <button className="button" type="button" onClick={reintentar}>Reintentar</button>}
        </PageState>
      </main>
    );
  }

  const perfil = resultado?.perfil;
  const coleccion = resultado?.coleccion;
  const vistas = coleccion?.visible ? coleccion.peliculas : null;
  const pendientes = coleccion?.pendientes_visibles ? coleccion.pendientes : null;
  const ambas = Boolean(vistas && pendientes);
  const lista = pendientes && (!vistas || vista.lista === "pendientes") ? "pendientes" : "vistas";
  const peliculas = lista === "vistas" ? vistas : pendientes;
  const notas = vistas ? new Map(vistas.map(({ id_tmdb, puntuacion_personal }) => [id_tmdb, puntuacion_personal])) : null;
  if (anterior && !perfil) {
    return (
      <main className="friend-profile page-container" aria-busy="true">
        <p className="friend-profile__returning" role="status">Volviendo al perfil…</p>
      </main>
    );
  }

  return (
    <main className={`friend-profile page-container${anterior ? " friend-profile--restored" : ""}`}>
      <div className="friend-profile__toolbar">
        {volver}
        {perfil && <OpcionesAmistad onRemove={() => setConfirmarBaja(true)} />}
      </div>
      {!perfil ? <PageState title="Cargando perfil…" /> : (
        <>
          <header className="friend-profile__identity">
            <div className="friend-profile__person">
              <ProfileAvatar user={perfil} className="friend-profile__avatar" iconSize={30}
                photoPath={`/amistades/usuarios/${perfil.id}/foto`} />
              <div className="friend-profile__name">
                <h1>{perfil.nombre_visible || perfil.nombre_usuario}</h1>
                <p className="friend-profile__handle">@{perfil.nombre_usuario}</p>
                <span className="friend-profile__friend-badge"><Icon name="check" size={12} />Amigos</span>
              </div>
            </div>
            {perfil.bio && <p className="friend-profile__bio">{perfil.bio}</p>}
            {vistas && <EstadisticasAmigo peliculas={vistas} vistasPropias={propias?.vistas} />}
          </header>
          <section ref={seccionDestacadas} className="friend-profile__section" aria-labelledby="friend-featured-heading">
            <div className="friend-profile__section-heading">
              <h2 id="friend-featured-heading"><Icon name="star" size={16} />Películas destacadas</h2>
              <span className="friend-profile__count" aria-label={`${perfil.destacadas.length} películas destacadas de un máximo de 4`}>{perfil.destacadas.length} / 4</span>
            </div>
            {perfil.destacadas.length ? (
              <PeliculasDelAmigo peliculas={perfil.destacadas} perfilId={perfil.id} notas={notas} recordarVista={recordarVista} />
            ) : <p className="friend-profile__message">Todavía no eligió películas destacadas.</p>}
          </section>
          <section ref={seccionColeccion} className="friend-profile__section" aria-labelledby="friend-collection-heading">
            <div className="friend-profile__section-heading">
              <h2 id="friend-collection-heading"><Icon name="library" size={16} />
                {ambas || !peliculas ? "Colección" : `Películas ${lista}`}
              </h2>
              {peliculas && !ambas && <span className="friend-profile__count">{formatoCantidad.format(peliculas.length)}</span>}
            </div>
            {coleccion.error ? (
              <div className="inline-error" role="alert">
                <span>{errorMessage(coleccion.error)}</span>
                <button className="button" type="button" onClick={reintentar}>Reintentar</button>
              </div>
            ) : peliculas ? (
              <ColeccionCompartida perfilId={perfil.id} peliculas={peliculas} lista={lista}
                vista={vista[lista] ?? FILTROS_INICIALES} pendientesPropias={propias?.pendientes}
                setVista={(filtros) => setVista((actual) => ({ ...actual, lista, [lista]: filtros }))}
                recordarVista={recordarVista}>
                {ambas && (
                  <div className="friend-profile__lists" role="group" aria-label="Elegir lista de películas">
                    {[["vistas", "Vistas", vistas.length], ["pendientes", "Pendientes", pendientes.length]].map(([tipo, titulo, cantidad]) => (
                      <button key={tipo} type="button" aria-pressed={lista === tipo}
                        onClick={() => setVista((actual) => ({ ...actual, lista: tipo }))}>
                        {titulo} <span>{formatoCantidad.format(cantidad)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </ColeccionCompartida>
            ) : <p className="friend-profile__message friend-profile__message--private"><Icon name="library" size={18} />Esta persona prefiere mantener su colección privada.</p>}
          </section>
          {confirmarBaja && (
            <ConfirmarBaja perfil={perfil} onClose={() => setConfirmarBaja(false)}
              onComplete={() => navigate("/comunidad", { replace: true, state: { amistadQuitada: true } })} />
          )}
        </>
      )}
    </main>
  );
}

export default function FriendProfilePage() {
  const { id } = useParams();
  const { sessionKey } = useAuth();
  return <PerfilAmigo key={`${sessionKey}-${id}`} id={id} />;
}
