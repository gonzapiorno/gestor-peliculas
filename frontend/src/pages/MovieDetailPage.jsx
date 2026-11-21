import useStartupReady from "../hooks/useStartupReady";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import CatalogAddDialog from "../components/movies/CatalogAddDialog";
import MovieDetailBackLink from "../components/movies/MovieDetailBackLink";
import Icon from "../components/ui/Icon";
import PageState from "../components/ui/PageState";
import MovieDetailLayout from "../components/movies/MovieDetailLayout";
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
  useStartupReady(!cargando && coleccion.estadoColeccion !== "loading");

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
  const amigo = Number.isInteger(state?.friendProfileId) && state.friendProfileId > 0 ? state.friendProfileId : null;
  const desdeMuro = state?.desdeMuro === true;
  const publicacionId = Number.isSafeInteger(state?.publicacionId) && state.publicacionId > 0 ? state.publicacionId : null;
  const destino = amigo ? `/comunidad/amigos/${amigo}${state.friendProfileCollection === true ? "?vista=coleccion" : ""}`
    : publicacionId ? `/comunidad/publicaciones/${publicacionId}`
      : desdeMuro ? "/comunidad" : resultadosUrl || (nombreCategoria ? catalogCategoryUrl(categoria, state.catalogSearch.decade) : "/");
  const textoVolver = amigo ? "Volver al perfil"
    : publicacionId ? "Volver a la publicación"
      : desdeMuro ? "Volver a Comunidad" : resultadosUrl ? "Volver a resultados" : nombreCategoria ? `Volver a ${nombreCategoria}` : "Volver a descubrir";
  const volver = (
    <MovieDetailBackLink to={destino} historyBack={Boolean(amigo) || desdeMuro || state?.catalogSearch?.fromDiscover === true}>
      {textoVolver}
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
  const tieneNotaPersonal = Number.isFinite(peliculaGuardada?.puntuacion_personal);

  return (
    <main className="movie-detail page-container">
      {volver}

      <MovieDetailLayout titleId="movie-title" titulo={pelicula.titulo} poster={pelicula.poster}
        anio={pelicula.anio} duracion={pelicula.duracion} generos={generos} puntuacion={pelicula.puntuacion}>
          <section className="movie-detail__synopsis" aria-labelledby="synopsis-heading">
            <h2 id="synopsis-heading">La historia</h2>
            <p>{pelicula.sinopsis || "Todavía no hay una sinopsis disponible para esta película."}</p>
          </section>

          <div className="movie-detail__collection-panel" aria-busy={agregando}>
            <div className="movie-detail__collection-copy">
              <h2>{enColeccion ? "En tu colección" : "Guardá esta película"}</h2>
              <p>{enColeccion
                ? "Administrá su estado, tu puntuación y tus favoritas."
                : "Elegí si ya la viste, poné tu nota y marcala como favorita."}
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
      </MovieDetailLayout>

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
