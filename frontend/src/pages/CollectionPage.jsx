import { useEffect, useState } from "react";

import MovieGrid from "../components/movies/MovieGrid";
import { obtenerPeliculas } from "../services/peliculasApi";


function CollectionPage() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Cargamos las películas guardadas en nuestra base de datos.
  useEffect(() => {
    async function cargarColeccion() {
      try {
        const datos = await obtenerPeliculas();
        setPeliculas(datos);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    }

    cargarColeccion();
  }, []);

  if (cargando) {
    return <p>Cargando colección...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <main>
      <h2>Mi colección</h2>

      <MovieGrid peliculas={peliculas} />
    </main>
  );
}

export default CollectionPage;