import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import useStartupReady from "../../hooks/useStartupReady";
import { cambiarMeGusta, crearComentario, obtenerComentarios, obtenerMuro } from "../../services/publicacionesApi";
import { errorMessage } from "../../utils/errorMessage";
import ProfileAvatar from "../account/ProfileAvatar";
import Icon from "../ui/Icon";
import PageState from "../ui/PageState";
import Poster from "../ui/Poster";
import CommunityComposer, { LIMITE_TEXTO } from "./CommunityComposer";
import "./CommunityFeed.css";

const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function Autor({ autor, fechaCreacion, enlazarPerfil = false }) {
  const { user } = useAuth();
  const propio = autor.id === user.id;
  const nombre = autor.nombre_visible || autor.nombre_usuario;
  return (
    <div className="community-person">
      <ProfileAvatar user={autor} className="community-person__avatar" iconSize={18}
        photoPath={propio ? undefined : `/amistades/usuarios/${autor.id}/foto`} />
      <div className="community-person__identity">
        {enlazarPerfil ? <Link className="community-post__author" to={propio ? "/cuenta" : `/comunidad/amigos/${autor.id}`}
          state={propio ? undefined : { desdeComunidad: true }}>{nombre}</Link> : <strong>{nombre}</strong>}
        <span>@{autor.nombre_usuario} · <time dateTime={fechaCreacion}>{fecha.format(new Date(fechaCreacion))}</time></span>
      </div>
    </div>
  );
}

function Comentarios({ idPublicacion, onComment }) {
  const campoId = useId();
  const primeraPagina = useRef(null);
  const leyendo = useRef(false);
  const enviando = useRef(false);
  const [pagina, setPagina] = useState(null);
  const [enviados, setEnviados] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const longitud = Array.from(texto.trim()).length;

  async function cargar() {
    if (leyendo.current) return;
    leyendo.current = true;
    setCargando(true);
    setErrorCarga("");
    try {
      const datos = await obtenerComentarios(idPublicacion, pagina?.siguiente_despues_de);
      setPagina((anterior) => ({
        ...datos,
        comentarios: [...(anterior?.comentarios ?? []), ...datos.comentarios],
      }));
    } catch (cause) {
      setErrorCarga(errorMessage(cause));
    } finally {
      leyendo.current = false;
      setCargando(false);
    }
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando.current || !longitud || longitud > LIMITE_TEXTO) return;
    enviando.current = true;
    setGuardando(true);
    setErrorEnvio("");
    try {
      const comentario = await crearComentario(idPublicacion, texto.trim());
      setEnviados((actuales) => [...actuales, comentario]);
      setTexto("");
      onComment();
    } catch (cause) {
      setErrorEnvio(errorMessage(cause));
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  // Conservamos los comentarios propios aunque su página todavía no se haya cargado.
  const comentarios = new Map([...(pagina?.comentarios ?? []), ...enviados].map((item) => [item.id, item]));

  useEffect(() => {
    let vigente = true;
    primeraPagina.current ??= obtenerComentarios(idPublicacion);
    primeraPagina.current
      .then((datos) => { if (vigente) setPagina(datos); })
      .catch((cause) => { if (vigente) setErrorCarga(errorMessage(cause)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [idPublicacion]);

  return (
    <div className="community-comments">
      {cargando && <p className="community-message" role="status">Cargando comentarios…</p>}
      {errorCarga && <p className="inline-error" role="alert">{errorCarga}</p>}
      {comentarios.size > 0 && (
        <ul className="community-comments__list">
          {[...comentarios.values()].sort((a, b) => a.id - b.id).map((item) => (
            <li key={item.id}>
              <Autor autor={item.autor} fechaCreacion={item.fecha_creacion} />
              <p>{item.contenido}</p>
            </li>
          ))}
        </ul>
      )}
      {pagina && !comentarios.size && <p className="community-message">Todavía no hay comentarios.</p>}
      {(pagina?.siguiente_despues_de != null || errorCarga) && (
        <button type="button" className="button" disabled={cargando} onClick={cargar}>
          {errorCarga ? "Reintentar comentarios" : "Cargar más comentarios"}
        </button>
      )}
      <form className="community-comments__form" onSubmit={enviar}>
        <label className="visually-hidden" htmlFor={campoId}>Tu comentario</label>
        <textarea id={campoId} placeholder="Escribí un comentario…" rows={2} value={texto} disabled={guardando}
          aria-invalid={longitud > LIMITE_TEXTO || undefined}
          aria-describedby={longitud > LIMITE_TEXTO ? `${campoId}-limite` : undefined}
          onChange={(event) => setTexto(event.target.value)} />
        {longitud > LIMITE_TEXTO && <p className="community-text-count" id={`${campoId}-limite`}>{longitud} / {LIMITE_TEXTO}</p>}
        {errorEnvio && <p className="inline-error" role="alert">{errorEnvio}</p>}
        <button type="submit" className="button button--primary" disabled={guardando || !longitud || longitud > LIMITE_TEXTO}>
          {guardando ? "Enviando…" : "Comentar"}
        </button>
      </form>
    </div>
  );
}

export function Publicacion({ datos, desdeDetalle = false }) {
  const { id, autor, pelicula, contenido, estado, puntuacion_personal, fecha_creacion } = datos;
  const panelId = useId();
  const reaccionando = useRef(false);
  const [meGusta, setMeGusta] = useState(datos.me_gusta);
  const [likes, setLikes] = useState(datos.cantidad_me_gusta);
  const [cantidadComentarios, setCantidadComentarios] = useState(datos.cantidad_comentarios);
  const [verComentarios, setVerComentarios] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reaccionar() {
    if (reaccionando.current) return;
    reaccionando.current = true;
    setBusy(true);
    setError("");
    try {
      const publicacion = await cambiarMeGusta(id, !meGusta);
      setMeGusta(publicacion.me_gusta);
      setLikes(publicacion.cantidad_me_gusta);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      reaccionando.current = false;
      setBusy(false);
    }
  }

  return (
    <article className="community-post" aria-label={`${pelicula.titulo} · @${autor.nombre_usuario}`}>
      <header className="community-post__header">
        <Autor autor={autor} fechaCreacion={fecha_creacion} enlazarPerfil />
        <span className="community-post__state" data-watching={estado === "viendo" || undefined}>
          <Icon name={estado === "viendo" ? "film" : "check"} size={14} />
          {estado === "viendo" ? "Está viendo" : "Ya la vio"}
        </span>
      </header>
      <Link to={`/pelicula/${pelicula.id_tmdb}`} state={{ desdeMuro: true, publicacionId: desdeDetalle ? id : undefined }} className="community-post__movie">
        <span className="community-post__poster" aria-hidden="true"><Poster src={pelicula.poster} title={pelicula.titulo} sizes="60px" /></span>
        <div>
          <h2>{pelicula.titulo}</h2>
          <p>{[pelicula.anio, pelicula.duracion > 0 ? `${pelicula.duracion} min` : null].filter(Boolean).join(" · ")}</p>
          {puntuacion_personal != null && <span className="community-post__rating">
            <Icon name="star" size={14} />{numero.format(puntuacion_personal)} / 10
          </span>}
        </div>
        <Icon name="chevron-right" size={16} />
      </Link>
      {contenido && <p className="community-post__text">{contenido}</p>}
      <div className="community-post__actions">
        <button className="button community-post__like" type="button" aria-pressed={meGusta} disabled={busy} onClick={reaccionar}>
          <Icon name="heart" size={17} />{likes} Me gusta
        </button>
        <button className="button community-post__comments-toggle" type="button" aria-expanded={verComentarios} aria-controls={panelId} onClick={() => setVerComentarios((abierto) => !abierto)}>
          <Icon name="message" size={17} />{cantidadComentarios} {cantidadComentarios === 1 ? "comentario" : "comentarios"}
          <Icon name="chevron-down" size={14} className="community-post__comments-chevron" />
        </button>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div id={panelId} hidden={!verComentarios}>
        {verComentarios && <Comentarios idPublicacion={id} onComment={() => setCantidadComentarios((cantidad) => cantidad + 1)} />}
      </div>
    </article>
  );
}

export default function CommunityFeed() {
  const inicial = useRef(null);
  const cargandoMas = useRef(false);
  const [publicaciones, setPublicaciones] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [agregando, setAgregando] = useState(false);
  const [paginaLista, setPaginaLista] = useState(false);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [componiendo, setComponiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  useStartupReady(!cargando);

  useEffect(() => {
    let vigente = true;
    if (inicial.current?.intento !== intento) inicial.current = { intento, promesa: obtenerMuro() };
    inicial.current.promesa.then((datos) => {
      if (!vigente) return;
      setPublicaciones(datos.publicaciones);
      setCursor(datos.siguiente_antes_de);
      setPaginaLista(true);
    }).catch((cause) => {
      if (vigente) setError(errorMessage(cause));
    }).finally(() => {
      if (vigente) setCargando(false);
    });
    return () => { vigente = false; };
  }, [intento]);

  async function cargarMas() {
    if (cargandoMas.current || cursor == null) return;
    cargandoMas.current = true;
    setAgregando(true);
    setError("");
    try {
      const datos = await obtenerMuro(cursor);
      setPublicaciones((actuales) => {
        const ids = new Set(actuales.map(({ id }) => id));
        return [...actuales, ...datos.publicaciones.filter(({ id }) => !ids.has(id))];
      });
      setCursor(datos.siguiente_antes_de);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      cargandoMas.current = false;
      setAgregando(false);
    }
  }

  return (
    <section className="community-feed" aria-label="Publicaciones">
      <div className="community-feed__toolbar">
        <button type="button" className="button button--primary" disabled={cargando} onClick={() => {
          setAviso("");
          setComponiendo(true);
        }}><Icon name="plus" size={17} />Compartir película</button>
      </div>
      <p className="visually-hidden" role="status">{aviso}</p>
      {cargando && <PageState title="Cargando publicaciones…" />}
      {error && <div className="inline-error" role="alert">
        <span>{error}</span>
        {!paginaLista && <button type="button" className="button" onClick={() => {
          setCargando(true);
          setError("");
          setIntento((valor) => valor + 1);
        }}>Reintentar</button>}
      </div>}
      {paginaLista && !publicaciones.length && (
        <PageState title="Todavía no hay publicaciones"
          description="Compartí una película y empezá la conversación con tus amigos." />
      )}
      {publicaciones.map((item) => <Publicacion key={item.id} datos={item} />)}
      {cursor != null && <button type="button" className="button community-feed__more" disabled={agregando} onClick={cargarMas}>
        {agregando ? "Cargando…" : error ? "Reintentar" : "Cargar más publicaciones"}
      </button>}
      {componiendo && <CommunityComposer onClose={() => setComponiendo(false)} onPublish={(item) => {
        setPublicaciones((actuales) => [item, ...actuales.filter(({ id }) => id !== item.id)]);
        setAviso("Película publicada.");
        setComponiendo(false);
      }} />}
    </section>
  );
}
