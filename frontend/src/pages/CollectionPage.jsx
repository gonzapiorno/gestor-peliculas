import { useEffect, useState } from "react";

import MovieGrid from "../components/movies/MovieGrid";
import {
  obtenerColeccion,
  actualizarEstado
} from "../services/coleccionApi";


function CollectionPage() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizandoId, setActualizandoId] = useState(null);
  const [errorCambio, setErrorCambio] = useState(null);

  // Cargamos las películas guardadas en nuestra base de datos.
  useEffect(() => {
    async function cargarColeccion() {
      try {
        const datos = await obtenerColeccion();
        setPeliculas(datos);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    }

    cargarColeccion();
  }, []);

  async function manejarCambiarEstado(pelicula) {
    if (actualizandoId !== null) return;

    // Si está vista, la pasamos a pendiente, y viceversa.
    const nuevoEstado =
      pelicula.estado === "vista" ? "pendiente" : "vista";

    setActualizandoId(pelicula.id);
    setErrorCambio(null);

    try {
      // Guardamos el nuevo estado en PostgreSQL.
      await actualizarEstado(pelicula.id, nuevoEstado);

      // Actualizamos también las películas que muestra React.
      setPeliculas((anteriores) =>
        anteriores.map((item) =>
          item.id === pelicula.id
            ? { ...item, estado: nuevoEstado }
            : item
        )
      );

    } catch (error) {
      setErrorCambio(error.message);
    } finally {
      setActualizandoId(null);
    }
  }

  if (cargando) {
    return <p>Cargando colección...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <main>
      <h2>Mi colección</h2>

      {errorCambio && <p role="alert">{errorCambio}</p>}

      <MovieGrid
        peliculas={peliculas}
        onCambiarEstado={manejarCambiarEstado}
        actualizando={actualizandoId !== null}
      />
    </main>
  );
}

export default CollectionPage;