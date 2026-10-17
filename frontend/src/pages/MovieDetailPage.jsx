import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Icon from "../components/ui/Icon";
import PageState from "../components/ui/PageState";
import Poster from "../components/ui/Poster";
import { obtenerDetallePelicula } from "../services/catalogoApi";
import { agregarAColeccion, obtenerColeccion } from "../services/coleccionApi";

import "./MovieDetailPage.css";
import { errorMessage } from "../utils/errorMessage";

function formatearNota(nota) {
  return nota.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function MovieDetailPage() {
  const { id } = useParams();
  const idActual = useRef(id);

  const [pelicula, setPelicula] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintentos, setReintentos] = useState(0);
  const [enColeccion, setEnColeccion] = useState(false);
  const [peliculaGuardada, setPeliculaGuardada] = useState(null);
  const [coleccionComprobada, setColeccionComprobada] = useState(false);
  const [errorColeccion, setErrorColeccion] = useState(null);
  const [reintentosColeccion, setReintentosColeccion] = useState(0);
  const [agregando, setAgregando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorAgregar, setErrorAgregar] = useState(false);

  useEffect(() => {
    idActual.current = id;
    return () => { idActual.current = null; };
  }, [id]);

  useEffect(() => {
    let cancelado = false;

    async function cargarDetalle() {
      setCargando(true);
      setError(null);
      setPelicula(null);
      setMensaje("");
      setErrorAgregar(false);
      setAgregando(false);

      try {
        const datos = await obtenerDetallePelicula(id);
        if (!cancelado) setPelicula(datos);
      } catch (error) {
        if (!cancelado) setError(errorMessage(error));
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarDetalle();
    return () => { cancelado = true; };
  }, [id, reintentos]);

  // La comprobación es independiente: un fallo de colección no oculta el detalle.
  useEffect(() => {
    let cancelado = false;

    async function comprobarColeccion() {
      setColeccionComprobada(false);
      setErrorColeccion(null);
      setEnColeccion(false);
      setPeliculaGuardada(null);

      try {
        const datos = await obtenerColeccion();
        if (cancelado) return;

        const guardada = datos.find((item) => Number(item.id_tmdb) === Number(id));
        setEnColeccion(Boolean(guardada));
        setPeliculaGuardada(guardada || null);
        setColeccionComprobada(true);
      } catch (error) {
        if (!cancelado) setErrorColeccion(errorMessage(error));
      }
    }

    comprobarColeccion();
    return () => { cancelado = true; };
  }, [id, reintentosColeccion]);

  async function manejarAgregar() {
    if (!pelicula || agregando || enColeccion || !coleccionComprobada) return;

    const idAlAgregar = id;
    setAgregando(true);
    setMensaje("");
    setErrorAgregar(false);

    try {
      const guardada = await agregarAColeccion(pelicula.id_tmdb);
      if (idActual.current !== idAlAgregar) return;

      setEnColeccion(true);
      setPeliculaGuardada(Object.hasOwn(guardada, "puntuacion_personal") ? guardada : null);
      setMensaje("Película agregada a tu colección.");
    } catch (error) {
      if (idActual.current !== idAlAgregar) return;

      if (error.message === "Esta película ya está en tu colección") {
        setEnColeccion(true);
        setMensaje("Esta película ya estaba guardada en tu colección.");
      } else {
        setErrorAgregar(true);
        setMensaje(errorMessage(error));
      }
    } finally {
      if (idActual.current === idAlAgregar) setAgregando(false);
    }
  }

  const volver = (
    <Link className="movie-detail__back" to="/">
      <Icon name="arrow-left" size={16} />Volver a descubrir
    </Link>
  );

  if (cargando) {
    return (
      <main className="movie-detail page-container">
        {volver}
        <div className="movie-detail__loading" role="status" aria-label="Cargando película">
          <div className="movie-detail__loading-poster" />
          <div className="movie-detail__loading-content">
            <span /><span /><span />
            <p>Cargando película…</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !pelicula) {
    return (
      <main className="movie-detail page-container">
        {volver}
        <PageState kind="error" title="Esta película no pudo llegar a la pantalla" description={error || "No pudimos recuperar los datos de la película."}>
          <button className="button" type="button" onClick={() => setReintentos((valor) => valor + 1)}>
            <Icon name="refresh" size={17} />Volver a intentar
          </button>
        </PageState>
      </main>
    );
  }

  const generos = Array.isArray(pelicula.generos) ? pelicula.generos : [];
  const tieneNotaCatalogo = Number.isFinite(pelicula.puntuacion);
  const tieneNotaPersonal = Number.isFinite(peliculaGuardada?.puntuacion_personal);

  return (
    <main className="movie-detail page-container">
      <nav className="movie-detail__breadcrumb" aria-label="Ruta de navegación">
        {volver}<span aria-hidden="true">/</span><span aria-current="page">{pelicula.titulo}</span>
      </nav>

      <div className="movie-detail__layout">
        <aside className="movie-detail__poster-column" aria-label="Póster e información técnica">
          <div className="movie-detail__poster">
            <Poster src={pelicula.poster} title={pelicula.titulo} />
          </div>
          <div className="movie-detail__poster-caption">
            <span>Película · TMDB</span>
            {pelicula.duracion > 0 && <span>{pelicula.duracion} min</span>}
          </div>
        </aside>

        <section className="movie-detail__content" aria-labelledby="movie-title">
          <p className="eyebrow">Una historia por descubrir</p>
          <h1 id="movie-title">{pelicula.titulo}</h1>

          <div className="movie-detail__meta">
            <span className="movie-detail__year">{pelicula.anio || "Año no disponible"}</span>
            {generos.length > 0 && <span className="movie-detail__meta-separator" aria-hidden="true">·</span>}
            <div className="movie-detail__genres">
              {generos.map((genero) => <span key={genero}>{genero}</span>)}
            </div>
          </div>

          <div className="movie-detail__rating">
            <Icon name="star" size={23} />
            <span className="movie-detail__score">{tieneNotaCatalogo ? formatearNota(pelicula.puntuacion) : "—"}</span>
            <div>
              <p>Puntuación del catálogo</p>
              <span>{tieneNotaCatalogo ? "TMDB · Sobre 10" : "TMDB · Sin valoración disponible"}</span>
            </div>
          </div>

          <section className="movie-detail__synopsis" aria-labelledby="synopsis-heading">
            <h2 id="synopsis-heading">La historia</h2>
            <p>{pelicula.sinopsis || "Todavía no hay una sinopsis disponible para esta película."}</p>
          </section>

          <div className="movie-detail__collection-panel" aria-busy={agregando}>
            <div className="movie-detail__collection-copy">
              <h2>{enColeccion ? "Ya es parte de tu historia." : "Hazla parte de tu historia."}</h2>
              <p>{enColeccion
                ? "Encuéntrala en tu colección para cambiar su estado, marcarla como favorita y guardar tu puntuación."
                : "Guárdala en tu colección para marcarla como vista, elegir tus favoritas y dejar tu puntuación personal."}
              </p>
            </div>
            <button
              type="button"
              className={`button ${enColeccion ? "" : "button--primary"}`}
              onClick={manejarAgregar}
              disabled={agregando || enColeccion || !coleccionComprobada}
            >
              <Icon name={enColeccion ? "check" : "plus"} size={17} />
              {agregando ? "Agregando…" : enColeccion ? "En mi colección" : !coleccionComprobada && !errorColeccion ? "Comprobando colección…" : "Agregar a mi colección"}
            </button>

            {errorColeccion && (
              <div className="movie-detail__collection-error inline-error" role="alert">
                <p>No pudimos comprobar si ya está en tu colección. {errorColeccion}.</p>
                <button className="button" type="button" onClick={() => setReintentosColeccion((valor) => valor + 1)}>
                  <Icon name="refresh" size={16} />Reintentar comprobación
                </button>
              </div>
            )}
          </div>

          {mensaje && (
            <p role={errorAgregar ? "alert" : "status"} className={`movie-detail__message ${errorAgregar ? "inline-error" : ""}`}>
              <Icon name={errorAgregar ? "alert" : "check"} size={16} />{mensaje}
            </p>
          )}

          {enColeccion && (
            <div className="movie-detail__personal">
              {peliculaGuardada && (
                <p><span>Tu puntuación personal</span><strong>{tieneNotaPersonal ? `${formatearNota(peliculaGuardada.puntuacion_personal)} / 10` : "Sin puntuar"}</strong></p>
              )}
              <Link to="/coleccion">Ir a mi colección<Icon name="arrow-right" size={16} /></Link>
            </div>
          )}
        </section>
      </div>

      <p className="movie-detail__note">Los datos y la puntuación del catálogo provienen de TMDB. Tu puntuación personal cuenta tu propia experiencia.</p>
    </main>
  );
}

export default MovieDetailPage;
