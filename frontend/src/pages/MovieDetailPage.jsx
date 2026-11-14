import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import CatalogAddDialog from "../components/movies/CatalogAddDialog";
import MovieDetailBackLink from "../components/movies/MovieDetailBackLink";
import Icon from "../components/ui/Icon";
import PageState from "../components/ui/PageState";
import Poster from "../components/ui/Poster";
import { obtenerDetallePelicula } from "../services/catalogoApi";
import useCatalogCollection from "../hooks/useCatalogCollection";

import "./MovieDetailPage.css";
import { errorMessage } from "../utils/errorMessage";
import { useAuth } from "../auth/useAuth";
import { catalogCategories, catalogCategoryUrl, catalogResultsUrl } from "../utils/catalogNavigation";

function formatearNota(nota) {
  return nota.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function MovieDetailPage() {
  const { status, user } = useAuth();
  const { state, pathname, search } = useLocation();
  const pendingVerification = status === "authenticated" && user?.email_verificado !== true;
  const { id } = useParams();
  const coleccion = useCatalogCollection();
  const detalleRequestRef = useRef(null);

  const [pelicula, setPelicula] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintentos, setReintentos] = useState(0);
  const [idParaAgregar, setIdParaAgregar] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarDetalle() {
      setCargando(true);
      setError(null);
      setPelicula(null);
      setIdParaAgregar(null);

      try {
        if (detalleRequestRef.current?.id !== id || detalleRequestRef.current.reintentos !== reintentos) {
          detalleRequestRef.current = { id, reintentos, promesa: obtenerDetallePelicula(id) };
        }
        const datos = await detalleRequestRef.current.promesa;
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

  const resultadosUrl = catalogResultsUrl(state?.catalogSearch?.query);
  const categoria = state?.catalogSearch?.category;
  const nombreCategoria = Object.hasOwn(catalogCategories, categoria) ? catalogCategories[categoria] : null;
  const destino = resultadosUrl || (nombreCategoria ? catalogCategoryUrl(categoria, state.catalogSearch.decade) : "/");
  const volver = (
    <MovieDetailBackLink to={destino} historyBack={state?.catalogSearch?.fromDiscover === true}>
      {resultadosUrl ? "Volver a resultados" : nombreCategoria ? `Volver a ${nombreCategoria}` : "Volver a descubrir"}
    </MovieDetailBackLink>
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
  const idTmdb = Number(id);
  const enColeccion = coleccion.guardadas.has(idTmdb);
  const peliculaGuardada = coleccion.guardadas.get(idTmdb);
  const agregando = coleccion.guardandoIds.has(idTmdb);
  const coleccionComprobada = coleccion.estadoColeccion === "ready";
  const errorColeccion = coleccion.errorColeccion;
  const from = `${pathname}${search}`;
  const tieneNotaCatalogo = Number.isFinite(pelicula.puntuacion);
  const tieneNotaPersonal = Number.isFinite(peliculaGuardada?.puntuacion_personal);

  return (
    <main className="movie-detail page-container">
      {volver}

      <div className="movie-detail__layout">
        <aside className="movie-detail__poster-column" aria-label="Póster e información técnica">
          <div className="movie-detail__poster">
            <Poster src={pelicula.poster} title={pelicula.titulo} />
          </div>
          <div className="movie-detail__poster-caption">
            <span>Película · TMDB</span>
          </div>
        </aside>

        <section className="movie-detail__content" aria-labelledby="movie-title">
          <p className="eyebrow">Una historia por descubrir</p>
          <h1 id="movie-title">{pelicula.titulo}</h1>

          <div className="movie-detail__meta">
            <span className="movie-detail__year">{pelicula.anio || "Año no disponible"}</span>
            {pelicula.duracion > 0 && (
              <span className="movie-detail__duration"><Icon name="clock" size={16} />{pelicula.duracion} min</span>
            )}
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
            {pendingVerification ? <Link className="button button--primary" to="/verificar-email" state={{ email: user.email, from }}>Verificar correo para guardar</Link> : status === "anonymous" || status === "error" ? (
              <Link className="button button--primary" to="/login" state={{ from }}>Iniciar sesión para guardar</Link>
            ) : <button
              type="button"
              className={`button ${enColeccion ? "" : "button--primary"}`}
              onClick={() => {
                if (coleccion.puedeAgregar(pelicula)) setIdParaAgregar(id);
              }}
              disabled={agregando || enColeccion || !coleccionComprobada}
            >
              <Icon name={enColeccion ? "check" : "plus"} size={17} />
              {agregando ? "Agregando…" : enColeccion ? "En mi colección" : !coleccionComprobada && !errorColeccion ? "Comprobando colección…" : "Agregar a mi colección"}
            </button>}

            {errorColeccion && (
              <div className="movie-detail__collection-error inline-error" role="alert">
                <p>No pudimos comprobar si ya está en tu colección. {errorColeccion}.</p>
                <button className="button" type="button" onClick={coleccion.reintentarColeccion}>
                  <Icon name="refresh" size={16} />Reintentar comprobación
                </button>
              </div>
            )}
          </div>

          <p className="visually-hidden" role="status">{coleccion.anuncio}</p>

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
      {idParaAgregar === id && (
        <CatalogAddDialog
          key={id}
          pelicula={pelicula}
          onAdd={coleccion.agregar}
          onClose={() => setIdParaAgregar((actual) => actual === id ? null : actual)}
        />
      )}
    </main>
  );
}

export default MovieDetailPage;
