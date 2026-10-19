import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import RatingDialog from "../components/movies/RatingDialog";
import Dialog from "../components/ui/Dialog";
import Icon from "../components/ui/Icon";
import PageState from "../components/ui/PageState";
import Poster from "../components/ui/Poster";
import { obtenerDetallePelicula } from "../services/catalogoApi";
import {
  obtenerPeliculaColeccion,
  actualizarEstado,
  actualizarFavorita,
  actualizarPuntuacion,
  eliminarDeColeccion,
} from "../services/coleccionApi";
import { errorMessage } from "../utils/errorMessage";
import { notificarCambioColeccion } from "../utils/collectionEvents";

import "./MovieDetailPage.css";
import "./CollectionMovieDetailPage.css";

function formatearNota(nota) {
  return nota.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

function PersonalMovieDetail({ id }) {
  const navigate = useNavigate();
  const idValido = /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const cicloRef = useRef(null);
  const guardandoRef = useRef(null);
  const [pelicula, setPelicula] = useState(null);
  const [cargando, setCargando] = useState(idValido);
  const [error, setError] = useState(idValido ? null : { status: 404, mensaje: "El enlace no corresponde a una película de tu colección." });
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(true);
  const [errorDetalle, setErrorDetalle] = useState(null);
  const [intentoDetalle, setIntentoDetalle] = useState(0);
  const [guardando, setGuardando] = useState(null);
  const [errorCambio, setErrorCambio] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [dialogo, setDialogo] = useState(null);

  // Cada ruta tiene su propio ciclo: una respuesta tardía no modifica otra película.
  useEffect(() => {
    const ciclo = { activo: true };
    cicloRef.current = ciclo;
    return () => { ciclo.activo = false; };
  }, []);

  useEffect(() => {
    if (!idValido) return;
    let vigente = true;

    obtenerPeliculaColeccion(id)
      .then((datos) => { if (vigente) setPelicula(datos); })
      .catch((cause) => {
        if (vigente) setError({ status: cause.status, mensaje: errorMessage(cause) });
      })
      .finally(() => { if (vigente) setCargando(false); });

    return () => { vigente = false; };
  }, [id, idValido, intentoCarga]);

  const idTmdb = pelicula?.id_tmdb;
  useEffect(() => {
    if (!idTmdb) return;
    let vigente = true;

    obtenerDetallePelicula(idTmdb)
      .then((datos) => { if (vigente) setDetalle(datos); })
      .catch((cause) => { if (vigente) setErrorDetalle(errorMessage(cause)); })
      .finally(() => { if (vigente) setCargandoDetalle(false); });

    return () => { vigente = false; };
  }, [idTmdb, intentoDetalle]);

  function reintentarCarga() {
    setCargando(true);
    setError(null);
    setIntentoCarga((intento) => intento + 1);
  }

  function reintentarDetalle() {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    setIntentoDetalle((intento) => intento + 1);
  }

  async function guardarCambio(tipo, valor) {
    const ciclo = cicloRef.current;
    if (!pelicula || !ciclo?.activo || guardandoRef.current) return false;

    const operacion = { tipo };
    guardandoRef.current = operacion;
    setGuardando(tipo);
    setErrorCambio(null);
    setMensaje("");

    try {
      let cambios;
      let confirmacion;
      if (tipo === "estado") {
        const respuesta = await actualizarEstado(pelicula.id, valor);
        cambios = { estado: respuesta.estado ?? valor };
        confirmacion = cambios.estado === "vista" ? "Marcada como vista." : "Marcada como pendiente.";
      } else if (tipo === "favorita") {
        const respuesta = await actualizarFavorita(pelicula.id, valor);
        cambios = { favorita: respuesta.favorita ?? valor };
        confirmacion = cambios.favorita ? "Agregada a tus favoritas." : "Quitada de tus favoritas.";
      } else if (tipo === "puntuacion") {
        const respuesta = await actualizarPuntuacion(pelicula.id, valor);
        cambios = { puntuacion_personal: respuesta.puntuacion_personal };
        confirmacion = valor == null ? "Puntuación quitada. La película quedó sin puntuar." : "Tu puntuación quedó guardada.";
      } else if (tipo === "eliminar") {
        await eliminarDeColeccion(pelicula.id);
      }

      notificarCambioColeccion(tipo, pelicula.id_tmdb);
      if (!ciclo.activo || guardandoRef.current !== operacion) return false;
      if (tipo === "eliminar") {
        navigate("/coleccion", { replace: true });
      } else {
        setPelicula((anterior) => ({ ...anterior, ...cambios }));
        setMensaje(confirmacion);
      }
      return true;
    } catch (cause) {
      if (ciclo.activo && guardandoRef.current === operacion) {
        setErrorCambio({ tipo, valor, mensaje: errorMessage(cause) });
      }
      return false;
    } finally {
      if (guardandoRef.current === operacion) {
        guardandoRef.current = null;
        if (ciclo.activo) setGuardando(null);
      }
    }
  }

  function abrirDialogo(tipo) {
    if (guardandoRef.current) return;
    setErrorCambio(null);
    setDialogo(tipo);
  }

  function cerrarDialogo() {
    if (guardandoRef.current) return;
    setDialogo(null);
    setErrorCambio(null);
  }

  const volver = (
    <Link className="movie-detail__back" to="/coleccion">
      <Icon name="arrow-left" size={16} />Volver a mi colección
    </Link>
  );

  if (cargando) {
    return (
      <main className="movie-detail collection-movie-detail page-container">
        {volver}
        <div className="movie-detail__loading" role="status" aria-label="Cargando película de tu colección">
          <div className="movie-detail__loading-poster" />
          <div className="movie-detail__loading-content"><span /><span /><span /><p>Abriendo tu película…</p></div>
        </div>
      </main>
    );
  }

  if (error || !pelicula) {
    const noEncontrada = error?.status === 404;
    return (
      <main className="movie-detail collection-movie-detail page-container">
        <div className="collection-movie-detail__back-row">{volver}</div>
        <PageState
          kind="error"
          title={noEncontrada ? "404 · Esta película no está en tu colección" : "No pudimos abrir tu película"}
          description={noEncontrada ? "Puede que se haya eliminado o que el enlace ya no esté disponible." : error?.mensaje || "No pudimos recuperar la película guardada."}
        >
          <Link className="button" to="/coleccion"><Icon name="library" size={17} />Ir a mi colección</Link>
          {!noEncontrada && (
            <button className="button" type="button" onClick={reintentarCarga}>
              <Icon name="refresh" size={17} />Volver a intentar
            </button>
          )}
        </PageState>
      </main>
    );
  }

  const titulo = detalle?.titulo || pelicula.titulo;
  const generos = Array.isArray(detalle?.generos) ? detalle.generos : [];
  const tieneNotaCatalogo = Number.isFinite(detalle?.puntuacion);
  const tieneNotaPersonal = Number.isFinite(pelicula.puntuacion_personal);
  const vista = pelicula.estado === "vista";
  const ocupado = guardando !== null;

  return (
    <main className="movie-detail collection-movie-detail page-container">
      <nav className="movie-detail__breadcrumb" aria-label="Ruta de navegación">
        {volver}<span aria-hidden="true">/</span><span aria-current="page">{titulo}</span>
      </nav>

      <div className="movie-detail__layout">
        <aside className="movie-detail__poster-column" aria-label="Póster e información técnica">
          <div className="movie-detail__poster"><Poster src={detalle?.poster || pelicula.poster} title={titulo} /></div>
          <div className="movie-detail__poster-caption">
            <span>Tu archivo personal</span>
            {detalle?.duracion > 0 && <span>{detalle.duracion} min</span>}
          </div>
        </aside>

        <section className="movie-detail__content" aria-labelledby="collection-movie-title">
          <p className="eyebrow">Una historia que se queda contigo</p>
          <h1 id="collection-movie-title">{titulo}</h1>
          <div className="movie-detail__meta">
            <span className="movie-detail__year">{detalle?.anio || pelicula.anio || "Año no disponible"}</span>
            {generos.length > 0 && <span className="movie-detail__meta-separator" aria-hidden="true">·</span>}
            <div className="movie-detail__genres">{generos.map((genero) => <span key={genero}>{genero}</span>)}</div>
          </div>

          <div className="movie-detail__rating" aria-busy={Boolean(idTmdb) && cargandoDetalle}>
            <Icon name="star" size={23} />
            <span className="movie-detail__score">{tieneNotaCatalogo ? formatearNota(detalle.puntuacion) : "—"}</span>
            <div>
              <p>Puntuación del catálogo</p>
              <span>{idTmdb && cargandoDetalle ? "Consultando TMDB…" : tieneNotaCatalogo ? "TMDB · Sobre 10" : "TMDB · Sin valoración disponible"}</span>
            </div>
          </div>

          <section className="movie-detail__synopsis" aria-labelledby="collection-synopsis-heading">
            <h2 id="collection-synopsis-heading">La historia</h2>
            <p>{idTmdb && cargandoDetalle && !detalle ? "Cargando la sinopsis…" : detalle?.sinopsis || "La sinopsis no está disponible por el momento."}</p>
          </section>

          {errorDetalle && (
            <div className="collection-movie-detail__metadata-error inline-error" role="alert">
              <div><p>No pudimos cargar la información de TMDB. Podés seguir gestionando tu película.</p><span>{errorDetalle}.</span></div>
              <button className="button" type="button" disabled={ocupado || cargandoDetalle} onClick={reintentarDetalle}>
                <Icon name="refresh" size={16} />Reintentar información
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="collection-movie-detail__personal" aria-labelledby="personal-movie-heading" aria-busy={ocupado}>
        <header className="collection-movie-detail__personal-heading">
          <div><h2 id="personal-movie-heading">Tu colección</h2><p>El lugar de esta película en tu historia de cine.</p></div>
          <span className="collection-movie-detail__saved"><Icon name={ocupado ? "refresh" : "bookmark"} size={16} />{ocupado ? guardando === "eliminar" ? "Eliminando…" : "Guardando…" : "En tu colección"}</span>
        </header>

        <p className="collection-movie-detail__confirmation" role="status" aria-live="polite">{mensaje}</p>

        {errorCambio && !dialogo && (
          <div className="inline-error collection-movie-detail__change-error" role="alert">
            <span>{errorCambio.mensaje}.</span>
            <button className="button" type="button" disabled={ocupado} onClick={() => guardarCambio(errorCambio.tipo, errorCambio.valor)}><Icon name="refresh" size={16} />Reintentar</button>
          </div>
        )}

        <div className="collection-movie-detail__controls">
          <div className="collection-movie-detail__control">
            <h3 id="watched-label">Ya la vi</h3>
            <button
              className={`collection-movie-detail__watched${vista ? " is-watched" : ""}`}
              type="button"
              role="switch"
              aria-checked={vista}
              aria-labelledby="watched-label"
              aria-describedby="watched-help"
              disabled={ocupado}
              onClick={() => guardarCambio("estado", vista ? "pendiente" : "vista")}
            >
              <span className="collection-movie-detail__switch" aria-hidden="true"><span /></span>
              <span>{vista ? "Vista" : "Pendiente"}</span>
            </button>
            <p id="watched-help">Marcala cuando termines de verla.</p>
          </div>

          <div className="collection-movie-detail__control">
            <h3>Tu puntuación</h3>
            <button
              className={`collection-movie-detail__rating${tieneNotaPersonal ? " has-rating" : ""}`}
              type="button"
              aria-haspopup="dialog"
              aria-label={tieneNotaPersonal ? `Editar tu puntuación: ${formatearNota(pelicula.puntuacion_personal)} sobre 10` : "Puntuar película: sin puntuar"}
              disabled={ocupado}
              onClick={() => abrirDialogo("puntuacion")}
            >
              <Icon name="star" size={20} />
              <strong>{tieneNotaPersonal ? formatearNota(pelicula.puntuacion_personal) : "Sin puntuar"}</strong>
              {tieneNotaPersonal && <span>/ 10</span>}
            </button>
            <p>Tu nota personal. Pulsá para {tieneNotaPersonal ? "editarla" : "puntuar"}.</p>
          </div>

          <div className="collection-movie-detail__control">
            <h3>Favorita</h3>
            <button
              className={`collection-movie-detail__favorite${pelicula.favorita ? " is-favorite" : ""}`}
              type="button"
              aria-pressed={pelicula.favorita}
              aria-label={pelicula.favorita ? "Quitar de favoritas" : "Marcar como favorita"}
              disabled={ocupado}
              onClick={() => guardarCambio("favorita", !pelicula.favorita)}
            >
              <Icon name="heart" size={20} /><span>{pelicula.favorita ? "En tus favoritas" : "Marcar como favorita"}</span>
            </button>
            <p>Para las historias a las que volverías.</p>
          </div>
        </div>

        <div className="collection-movie-detail__remove">
          <p>Podés quitar esta película de tu colección cuando quieras.</p>
          <button className="button collection-movie-detail__remove-button" type="button" disabled={ocupado} aria-haspopup="dialog" onClick={() => abrirDialogo("eliminar")}><Icon name="trash" size={16} />Eliminar película</button>
        </div>
      </section>

      <p className="movie-detail__note">La información y la puntuación del catálogo provienen de TMDB. Tu puntuación personal cuenta tu propia experiencia.</p>

      {dialogo === "puntuacion" && (
        <RatingDialog
          key={pelicula.id}
          pelicula={pelicula}
          onClose={cerrarDialogo}
          onSave={(_pelicula, nota) => guardarCambio("puntuacion", nota)}
          busy={ocupado}
          error={errorCambio?.mensaje}
        />
      )}

      {dialogo === "eliminar" && (
        <Dialog title="¿Eliminar de tu colección?" description={`Se eliminará «${pelicula.titulo}» junto con tu puntuación y su estado. Podés volver a agregarla desde Descubrir.`} onClose={cerrarDialogo} busy={ocupado}>
          {errorCambio && <p className="inline-error" role="alert">{errorCambio.mensaje}.</p>}
          <div className="dialog__actions">
            <button className="button" type="button" data-autofocus disabled={ocupado} onClick={cerrarDialogo}>Cancelar</button>
            <button className="button button--danger" type="button" disabled={ocupado} onClick={() => guardarCambio("eliminar")}><Icon name="trash" size={16} />{guardando === "eliminar" ? "Eliminando…" : "Eliminar película"}</button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

export default function CollectionMovieDetailPage() {
  const { id } = useParams();
  return <PersonalMovieDetail key={id} id={id} />;
}
