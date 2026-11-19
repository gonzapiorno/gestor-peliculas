import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import ProfileAvatar from "../components/account/ProfileAvatar";
import MovieDetailBackLink from "../components/movies/MovieDetailBackLink";
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

function normalizarTitulo(titulo) {
  return titulo.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
}

function PeliculasDelAmigo({ peliculas, perfilId, enColeccion = false, recordarVista, notas }) {
  return (
    <ul className={`profile-featured__grid${enColeccion ? " friend-profile__watched-grid" : ""}`}>
      {peliculas.map((pelicula) => {
        const nota = enColeccion ? pelicula.puntuacion_personal : notas?.get(pelicula.id_tmdb);
        return (
          <li key={pelicula.id_tmdb} data-collection-movie={pelicula.id_tmdb}>
            <Link className="profile-featured__slot" to={`/pelicula/${pelicula.id_tmdb}`}
              state={{ friendProfileId: perfilId, friendProfileCollection: enColeccion }}
              onClick={(event) => recordarVista(event, pelicula.id_tmdb, enColeccion)}>
              <span className="profile-featured__poster" aria-hidden="true">
                <Poster src={pelicula.poster} title={pelicula.titulo}
                  sizes={enColeccion ? "(max-width: 600px) 30vw, 160px" : "(max-width: 600px) 45vw, 200px"} />
              </span>
              <span className="profile-featured__title">{pelicula.titulo}</span>
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

function EstadisticasAmigo({ peliculas }) {
  const [enComun, setEnComun] = useState(null);
  useEffect(() => {
    if (!peliculas.length) return;
    let vigente = true;
    obtenerColeccion().then((propias) => {
      if (!vigente) return;
      const vistasPropias = new Set(propias.filter(({ estado }) => estado === "vista").map(({ id_tmdb }) => id_tmdb));
      setEnComun(peliculas.filter(({ id_tmdb }) => vistasPropias.has(id_tmdb)).length);
    }).catch(() => { if (vigente) setEnComun(null); });
    return () => { vigente = false; };
  }, [peliculas]);

  const { promedio } = collectionStatistics(peliculas);
  const coincidencias = peliculas.length ? enComun : 0;
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

function ColeccionCompartida({ peliculas, perfilId, vista, setVista, recordarVista }) {
  const buscador = useRef(null);
  const consulta = normalizarTitulo(vista.busqueda.trim());
  const filtradas = peliculas.filter(({ titulo }) => normalizarTitulo(titulo).includes(consulta));
  if (vista.orden === "nota") {
    filtradas.sort((a, b) => (b.puntuacion_personal ?? 0) - (a.puntuacion_personal ?? 0));
  }
  const mostradas = vista.todas ? filtradas : filtradas.slice(0, LIMITE_INICIAL);

  if (!peliculas.length) return <p className="friend-profile__message">Todavía no marcó películas como vistas.</p>;
  return (
    <>
      <div className="friend-profile__filters">
        <div className="search-field friend-profile__search">
          <Icon name="search" size={17} />
          <input ref={buscador} className="field-input" type="search" aria-label="Buscar en las películas vistas"
            placeholder="Buscar por título…" value={vista.busqueda}
            onChange={(event) => setVista({ ...vista, busqueda: event.target.value })} />
          {vista.busqueda && (
            <button className="icon-button" type="button" aria-label="Limpiar búsqueda" onClick={() => {
              setVista({ ...vista, busqueda: "" });
              buscador.current?.focus();
            }}><Icon name="close" size={18} /></button>
          )}
        </div>
        <div className="friend-profile__sort" role="group" aria-label="Orden de películas vistas">
          <button type="button" aria-pressed={vista.orden === "recientes"}
            onClick={() => setVista({ ...vista, orden: "recientes" })}>Recientes</button>
          <button type="button" aria-pressed={vista.orden === "nota"}
            onClick={() => setVista({ ...vista, orden: "nota" })}>Mejores notas</button>
        </div>
      </div>
      {mostradas.length
        ? <PeliculasDelAmigo peliculas={mostradas} perfilId={perfilId} recordarVista={recordarVista} enColeccion />
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
  const [vista, setVista] = useState(() => anterior?.vista ?? { busqueda: "", orden: "recientes", todas: false });
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
            {vistas && <EstadisticasAmigo peliculas={vistas} />}
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
              <h2 id="friend-collection-heading"><Icon name="library" size={16} />Películas vistas</h2>
              {vistas && <span className="friend-profile__count">{formatoCantidad.format(vistas.length)}</span>}
            </div>
            {coleccion.error ? (
              <div className="inline-error" role="alert">
                <span>{errorMessage(coleccion.error)}</span>
                <button className="button" type="button" onClick={reintentar}>Reintentar</button>
              </div>
            ) : vistas ? (
              <ColeccionCompartida perfilId={perfil.id} peliculas={vistas}
                vista={vista} setVista={setVista} recordarVista={recordarVista} />
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
  return <PerfilAmigo key={id} id={id} />;
}
