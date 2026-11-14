import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";

import CatalogMovieGrid from "../components/movies/CatalogMovieGrid";
import CatalogAddDialog from "../components/movies/CatalogAddDialog";
import CatalogCarousel from "../components/movies/CatalogCarousel";
import CatalogDecadePicker from "../components/movies/CatalogDecadePicker";
import MovieDetailBackLink from "../components/movies/MovieDetailBackLink";
import Icon from "../components/ui/Icon";
import PageState, { MovieSkeleton } from "../components/ui/PageState";

import "./DiscoverPage.css";
import useMovieSearch from "../hooks/useMovieSearch";
import useCatalogCollection from "../hooks/useCatalogCollection";
import useCatalogPages from "../hooks/useCatalogPages";
import { catalogCategories, catalogCategory, catalogCategoryUrl, catalogDecade, catalogQuery, resultPosition } from "../utils/catalogNavigation";

const opcionesCarrusel = { cantidadInicial: 14 };

function DiscoverResults({ location }) {
  const search = useMovieSearch(catalogQuery(location));
  const buscando = search.eligible;
  const categoria = buscando ? null : catalogCategory(location);
  const decada = categoria ? catalogDecade(location) : null;
  const enInicio = !buscando && !categoria;
  const { key } = location;
  const [columnas, setColumnas] = useState(0);
  const catalogo = useCatalogPages(categoria, key, { columnas: columnas || 1, decada });
  const populares = useCatalogPages(enInicio ? "populares" : null, key, opcionesCarrusel);
  const thriller = useCatalogPages(enInicio ? "thriller" : null, key, opcionesCarrusel);
  const drama = useCatalogPages(enInicio ? "drama" : null, key, opcionesCarrusel);
  const romance = useCatalogPages(enInicio ? "romance" : null, key, opcionesCarrusel);
  const secciones = [
    { categoria: "populares", titulo: "Populares ahora", datos: populares },
    { categoria: "thriller", titulo: "Thriller", datos: thriller },
    { categoria: "drama", titulo: "Drama", datos: drama, requiereSoporte: true },
    { categoria: "romance", titulo: "Romance", datos: romance, requiereSoporte: true },
  ];
  const coleccion = useCatalogCollection();
  const [peliculaParaAgregar, setPeliculaParaAgregar] = useState(null);
  const gridRef = useRef(null);
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const restoredEntry = useRef(null);

  const peliculasVisibles = buscando ? search.results : catalogo.peliculas;
  const cargandoVista = buscando ? search.status === "loading" : catalogo.cargando;
  const errorVista = buscando ? search.error : catalogo.error;
  const cargaInicial = cargandoVista && peliculasVisibles.length === 0;
  const errorInicial = errorVista && peliculasVisibles.length === 0;
  const hayCuadricula = Boolean(categoria && peliculasVisibles.length > 0);
  const listoParaVolver = enInicio
    ? secciones.every(({ datos }) => !datos.cargando)
    : !cargaInicial && !errorInicial && (!hayCuadricula || columnas > 0);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    function medirColumnas() {
      const tracks = getComputedStyle(grid).gridTemplateColumns.split(" ");
      setColumnas(tracks.length);
    }
    medirColumnas();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medirColumnas) : null;
    observer?.observe(grid);
    return () => observer?.disconnect();
  }, [hayCuadricula]);

  useLayoutEffect(() => {
    if (navigationType !== "POP" || !listoParaVolver || restoredEntry.current === key) return;
    restoredEntry.current = key;
    const posicion = resultPosition(key);
    if (!posicion) return;
    window.scrollTo({ top: posicion.top, left: 0, behavior: "instant" });
    for (const [id, left] of posicion.carousels) {
      document.getElementById(id)?.scrollTo({ left, behavior: "instant" });
    }
  }, [key, listoParaVolver, navigationType]);

  const tarjetas = {
    guardadas: coleccion.guardadas,
    guardandoIds: coleccion.guardandoIds,
    errores: coleccion.errores,
    estadoColeccion: coleccion.estadoColeccion,
    onAgregar: (pelicula) => {
      if (coleccion.puedeAgregar(pelicula)) setPeliculaParaAgregar(pelicula);
    },
  };
  const titulo = buscando ? "Resultados de búsqueda" : catalogCategories[categoria] ?? "Descubrir";
  const descripcion = buscando ? `Películas para «${search.query.trim()}».`
    : categoria === "thriller" ? "Explorá películas de suspenso." : categoria === "populares" ? "Lo que se está viendo en TMDB." : null;
  const tituloSeccion = buscando ? "Películas encontradas" : categoria === "populares" ? "Populares ahora" : `Películas de ${titulo}`;

  function cambiarDecada(decade) {
    navigate(catalogCategoryUrl(categoria, decade), {
      replace: true,
      state: location.state,
    });
  }

  return (
    <main className={`discover-page page-container${enInicio ? " discover-page--inicio" : ""}`}>
      {categoria && (
        <MovieDetailBackLink to="/" historyBack={location.state?.desdeDescubrir === true}>
          Volver a descubrir
        </MovieDetailBackLink>
      )}
      <header className="discover-page__header page-heading">
        <div>
          {!enInicio && <p className="eyebrow">TU PRÓXIMA HISTORIA</p>}
          <h1 className="page-title">{titulo}</h1>
          {descripcion && <p className="page-description">{descripcion}</p>}
        </div>
        {buscando && <Link className="button" to="/">Ver populares</Link>}
      </header>


      <p className="visually-hidden" role="status">{coleccion.anuncio}</p>
      {coleccion.estadoColeccion === "error" && (
        <div className="discover-page__collection-error inline-error" role="alert">
          <p><Icon name="alert" size={16} /> {coleccion.errorColeccion}. Podés seguir explorando. Reintentá la comprobación para agregar películas desde las tarjetas.</p>
          <button className="button" type="button" onClick={coleccion.reintentarColeccion}><Icon name="refresh" size={16} />Reintentar comprobación</button>
        </div>
      )}

      {enInicio ? secciones
        .filter(({ requiereSoporte, datos }) => !requiereSoporte || datos.errorStatus !== 422)
        .map(({ categoria, titulo, datos }) => (
          <CatalogCarousel key={categoria} categoria={categoria} titulo={titulo} catalogo={datos} tarjetas={tarjetas} entry={key} />
        )) : <section className="discover-page__catalog" aria-labelledby="radar-heading" aria-busy={cargandoVista}>
        <div className="discover-page__section-heading">
          <h2 id="radar-heading">{tituloSeccion}</h2>
          {categoria ? (
            <CatalogDecadePicker value={decada} onChange={cambiarDecada} />
          ) : <span role="status">{cargandoVista ? "Buscando…" : errorVista ? "Búsqueda no disponible" : `${peliculasVisibles.length} ${peliculasVisibles.length === 1 ? "resultado" : "resultados"}`}</span>}
        </div>

        {cargaInicial ? (
          <MovieSkeleton count={6} />
        ) : errorInicial ? (
          <PageState kind="error" title={buscando ? "No pudimos completar la búsqueda" : "El catálogo no pudo llegar a la pantalla"} description={errorInicial}>
            <button className="button" type="button" onClick={buscando ? search.retry : catalogo.cargarMas}>
              <Icon name="refresh" size={17} />Volver a intentar
            </button>
          </PageState>
        ) : buscando && peliculasVisibles.length === 0 ? (
          <PageState kind="search" title="No encontramos películas con ese título" description="Probá con otro título o volvé a explorar las películas populares.">
            <Link className="button" to="/">Ver populares</Link>
          </PageState>
        ) : peliculasVisibles.length === 0 ? (
          <PageState title={decada ? "No encontramos películas de esta década" : "Todavía no hay películas para mostrar"} />
        ) : (
          <CatalogMovieGrid {...tarjetas} peliculas={peliculasVisibles} gridRef={categoria ? gridRef : undefined} />
        )}

        {!buscando && catalogo.hayMas && !cargaInicial && !errorInicial && (
          <div className="discover-page__more">
            {catalogo.error && <p className="discover-page__more-error" role="alert">No pudimos cargar más películas. {catalogo.error}.</p>}
            <button className="button button--primary" type="button" aria-disabled={catalogo.cargando} onClick={catalogo.cargarMas}>
              <Icon name={catalogo.error ? "refresh" : "chevron-down"} size={17} />
              {catalogo.cargando ? "Cargando películas…" : catalogo.error ? "Reintentar" : "Cargar más"}
            </button>
            <p className="visually-hidden" role="status">{peliculasVisibles.length} películas visibles</p>
          </div>
        )}
      </section>}

      <aside className="discover-page__collection-cta">
        <Icon name="library" size={24} />
        <div>
          <h2>¿Cuál vas a ver después?</h2>
          <p>Guardá tus pendientes y volvé a tus favoritas cuando quieras.</p>
        </div>
        <Link className="button" to="/coleccion"><Icon name="arrow-right" size={17} />Ir a mi colección</Link>
      </aside>
      {peliculaParaAgregar && (
        <CatalogAddDialog pelicula={peliculaParaAgregar} onAdd={coleccion.agregar} onClose={() => setPeliculaParaAgregar(null)} />
      )}
    </main>
  );
}

export default function DiscoverPage() {
  const location = useLocation();
  return <DiscoverResults key={location.key} location={location} />;
}
