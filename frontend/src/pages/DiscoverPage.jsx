import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import CatalogMovieGrid from "../components/movies/CatalogMovieGrid";
import Icon from "../components/ui/Icon";
import PageState, { MovieSkeleton } from "../components/ui/PageState";
import { obtenerPopulares } from "../services/catalogoApi";

import "./DiscoverPage.css";
import { errorMessage } from "../utils/errorMessage";
import useMovieSearch from "../hooks/useMovieSearch";
import useCatalogCollection from "../hooks/useCatalogCollection";

function DiscoverPage() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintentos, setReintentos] = useState(0);
  const [searchParams] = useSearchParams();
  const search = useMovieSearch(searchParams.get("buscar") || "");
  const coleccion = useCatalogCollection();
  const catalogRequestRef = useRef(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarCatalogo() {
      setCargando(true);
      setError(null);

      try {
        if (catalogRequestRef.current?.intento !== reintentos) {
          catalogRequestRef.current = { intento: reintentos, promesa: obtenerPopulares() };
        }
        const datos = await catalogRequestRef.current.promesa;
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

  return (
    <main className="discover-page page-container">
      <header className="discover-page__header page-heading">
        <div>
          <p className="eyebrow">TU PRÓXIMA HISTORIA</p>
          <h1 className="page-title">{buscando ? "Resultados de búsqueda" : "Descubrir"}</h1>
          <p className="page-description">
            {buscando ? `Películas para «${search.query.trim()}».` : "Encontrá algo que te den ganas de ver."}
          </p>
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

      <section className="discover-page__catalog" aria-labelledby="radar-heading" aria-busy={cargandoVista}>
        <div className="discover-page__section-heading">
          <div><h2 id="radar-heading">{buscando ? "Películas encontradas" : "Populares ahora"}</h2>
            {!buscando && <p>Lo que se está viendo en TMDB.</p>}
          </div>
          <span role="status">{buscando ? cargandoVista ? "Buscando…" : errorVista ? "Búsqueda no disponible" : `${peliculasVisibles.length} ${peliculasVisibles.length === 1 ? "resultado" : "resultados"}` : <><Icon name="film" size={15} /> Catálogo TMDB</>}</span>
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
            <Link className="button" to="/">Ver populares</Link>
          </PageState>
        ) : peliculasVisibles.length === 0 ? (
          <PageState title="Todavía no hay películas para mostrar" description="Vuelve a consultar el catálogo en un momento.">
            <button className="button" type="button" onClick={() => setReintentos((valor) => valor + 1)}>
              <Icon name="refresh" size={17} />Actualizar catálogo
            </button>
          </PageState>
        ) : (
          <CatalogMovieGrid peliculas={peliculasVisibles} guardadas={coleccion.guardadas} guardandoIds={coleccion.guardandoIds} errores={coleccion.errores} estadoColeccion={coleccion.estadoColeccion} onAgregar={coleccion.agregar} />
        )}
      </section>

      <aside className="discover-page__collection-cta">
        <Icon name="library" size={24} />
        <div>
          <h2>¿Cuál vas a ver después?</h2>
          <p>Guardá tus pendientes y volvé a tus favoritas cuando quieras.</p>
        </div>
        <Link className="button" to="/coleccion"><Icon name="arrow-right" size={17} />Ir a mi colección</Link>
      </aside>
    </main>
  );
}

export default DiscoverPage;
