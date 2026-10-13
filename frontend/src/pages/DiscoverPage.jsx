import { useEffect, useState } from "react";

import CatalogMovieGrid from "../components/movies/CatalogMovieGrid";
import { obtenerPopulares } from "../services/catalogoApi";

import "./DiscoverPage.css";


function DiscoverPage() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Consultamos nuestro backend al cargar la pantalla.
  // FastAPI obtiene el catálogo desde TMDB.
  useEffect(() => {
    async function cargarCatalogo() {
      try {
        const datos = await obtenerPopulares();
        setPeliculas(datos);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    }

    cargarCatalogo();
  }, []);

  if (cargando) {
    return <p>Cargando catálogo...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <main className="discover-page">

      <header className="discover-page__header">
        <span className="discover-page__eyebrow">
          DESCUBRIR
        </span>

        <h2 className="discover-page__title">
          Encontrá tu próxima película.
        </h2>

        <p className="discover-page__description">
          Explorá películas populares y encontrá cuáles querés
          sumar a tu colección.
        </p>
      </header>

      <CatalogMovieGrid peliculas={peliculas} />

    </main>
  );
}

export default DiscoverPage;