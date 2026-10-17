import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import CatalogMovieGrid from "../components/movies/CatalogMovieGrid";
import Icon from "../components/ui/Icon";
import PageState, { MovieSkeleton } from "../components/ui/PageState";
import { obtenerPopulares } from "../services/catalogoApi";

import "./DiscoverPage.css";
import { errorMessage } from "../utils/errorMessage";

function normalizar(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function DiscoverPage() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [reintentos, setReintentos] = useState(0);

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

  const peliculasVisibles = useMemo(() => {
    const consulta = normalizar(busqueda.trim());
    return peliculas.filter((pelicula) => normalizar(pelicula.titulo || "").includes(consulta));
  }, [peliculas, busqueda]);

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

      <form className="discover-page__search" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="visually-hidden" htmlFor="discover-search">Buscar entre películas populares</label>
        <div className="search-field">
          <Icon name="search" size={19} />
          <input
            id="discover-search"
            className="field-input"
            type="search"
            placeholder="Buscar entre populares…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            aria-describedby="discover-search-hint"
          />
          {busqueda && (
            <button className="icon-button" type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda">
              <Icon name="close" size={17} />
            </button>
          )}
        </div>
        <p id="discover-search-hint">Busca por título entre las películas populares cargadas.</p>
      </form>

      <section className="discover-page__catalog" aria-labelledby="radar-heading" aria-busy={cargando}>
        <div className="discover-page__section-heading">
          <h2 id="radar-heading">En el radar</h2>
          <span>{busqueda.trim() ? `${peliculasVisibles.length} resultados` : "Populares en TMDB"}</span>
        </div>

        {cargando ? (
          <MovieSkeleton count={6} />
        ) : error ? (
          <PageState kind="error" title="El catálogo no pudo llegar a la pantalla" description={error}>
            <button className="button" type="button" onClick={() => setReintentos((valor) => valor + 1)}>
              <Icon name="refresh" size={17} />Volver a intentar
            </button>
          </PageState>
        ) : peliculas.length === 0 ? (
          <PageState title="Todavía no hay películas para mostrar" description="Vuelve a consultar el catálogo en un momento.">
            <button className="button" type="button" onClick={() => setReintentos((valor) => valor + 1)}>
              <Icon name="refresh" size={17} />Actualizar catálogo
            </button>
          </PageState>
        ) : peliculasVisibles.length === 0 ? (
          <PageState kind="search" title="No encontramos ese título entre los populares" description="Prueba con otro título o limpia la búsqueda para volver al catálogo.">
            <button className="button" type="button" onClick={() => setBusqueda("")}>Limpiar búsqueda</button>
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
