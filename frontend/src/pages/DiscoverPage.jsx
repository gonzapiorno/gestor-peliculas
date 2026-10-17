import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import CatalogMovieGrid from "../components/movies/CatalogMovieGrid";
import MovieSearch from "../components/movies/MovieSearch";
import Icon from "../components/ui/Icon";
import PageState, { MovieSkeleton } from "../components/ui/PageState";
import { obtenerPopulares } from "../services/catalogoApi";

import "./DiscoverPage.css";
import { errorMessage } from "../utils/errorMessage";
import useMovieSearch from "../hooks/useMovieSearch";

function DiscoverPage() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintentos, setReintentos] = useState(0);
  const search = useMovieSearch();
  const resultsHeadingRef = useRef(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarCatalogo() {
      setCargando(true);
      setError(null);

      try {
        const datos = await obtenerPopulares();
        if (!cancelado) setPeliculas(datos);
      } catch (error) {
        if (!cancelado) setError(errorMessage(error));
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarCatalogo();
    return () => { cancelado = true; };
  }, [reintentos]);

  const buscando = search.eligible;
  const cargandoVista = buscando ? search.status === "loading" : cargando;
  const errorVista = buscando ? search.error : error;
  const peliculasVisibles = buscando ? search.results : peliculas;

  function mostrarResultados() {
    resultsHeadingRef.current?.scrollIntoView({ block: "start" });
    resultsHeadingRef.current?.focus({ preventScroll: true });
  }

  return (
    <main className="discover-page page-container">
      <header className="discover-page__header page-heading">
        <div>
          <p className="eyebrow">El cine, a tu manera</p>
          <h1 className="page-title">Tu próxima gran película.</h1>
          <p className="page-description">
            Explora el catálogo. Guarda lo que te inspira. Construye tu propia historia de cine.
          </p>
        </div>
        <span className="discover-page__source"><Icon name="film" size={15} />Catálogo externo · TMDB</span>
      </header>

      <MovieSearch query={search.query} onQueryChange={search.setQuery} results={search.results} status={search.status} error={search.error} onRetry={search.retry} onViewAll={mostrarResultados} />

      <section className="discover-page__catalog" aria-labelledby="radar-heading" aria-busy={cargandoVista}>
        <div className="discover-page__section-heading">
          <h2 id="radar-heading" ref={resultsHeadingRef} tabIndex={-1}>{buscando ? `Resultados para «${search.query.trim()}»` : "En el radar"}</h2>
          <span role="status">{buscando ? cargandoVista ? "Buscando en TMDB…" : errorVista ? "Búsqueda no disponible" : `${peliculasVisibles.length} ${peliculasVisibles.length === 1 ? "resultado" : "resultados"}` : "Populares en TMDB"}</span>
        </div>

        {cargandoVista ? (
          <MovieSkeleton count={6} />
        ) : errorVista ? (
          <PageState kind="error" title={buscando ? "No pudimos completar la búsqueda" : "El catálogo no pudo llegar a la pantalla"} description={errorVista}>
            <button className="button" type="button" onClick={() => buscando ? search.retry() : setReintentos((valor) => valor + 1)}>
              <Icon name="refresh" size={17} />Volver a intentar
            </button>
          </PageState>
        ) : buscando && peliculasVisibles.length === 0 ? (
          <PageState kind="search" title="No encontramos películas con ese título" description="Probá con otro título o volvé a explorar las películas populares.">
            <button className="button" type="button" onClick={() => search.setQuery("")}>Ver populares</button>
          </PageState>
        ) : peliculasVisibles.length === 0 ? (
          <PageState title="Todavía no hay películas para mostrar" description="Vuelve a consultar el catálogo en un momento.">
            <button className="button" type="button" onClick={() => setReintentos((valor) => valor + 1)}>
              <Icon name="refresh" size={17} />Actualizar catálogo
            </button>
          </PageState>
        ) : (
          <CatalogMovieGrid peliculas={peliculasVisibles} />
        )}
      </section>

      <aside className="discover-page__collection-cta">
        <Icon name="library" size={24} />
        <div>
          <h2>No dejes que una buena película se pierda.</h2>
          <p>Tu colección reúne las que viste, las que esperas ver y las que volverías a ver.</p>
        </div>
        <Link className="button" to="/coleccion"><Icon name="arrow-right" size={17} />Ir a mi colección</Link>
      </aside>
    </main>
  );
}

export default DiscoverPage;
