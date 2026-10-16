import { useEffect, useState } from "react";

import MovieGrid from "../components/movies/MovieGrid";
import {
  obtenerColeccion,
  actualizarEstado,
  actualizarFavorita,
  actualizarPuntuacion,
  eliminarDeColeccion
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

  async function manejarCambiarFavorita(pelicula) {
    if (actualizandoId !== null) return;

    // Invertimos el valor actual.
    const nuevoValor = !pelicula.favorita;

    setActualizandoId(pelicula.id);
    setErrorCambio(null);

    try {
      // Guardamos el cambio en PostgreSQL.
      await actualizarFavorita(pelicula.id, nuevoValor);

      // Actualizamos el estado local de React.
      setPeliculas((anteriores) =>
        anteriores.map((item) =>
          item.id === pelicula.id
            ? { ...item, favorita: nuevoValor }
            : item
        )
      );
    } catch (error) {
      setErrorCambio(error.message);
    } finally {
      setActualizandoId(null);
    }
  }

  async function manejarCambiarPuntuacion(pelicula, nuevaPuntuacion) {
    if (actualizandoId !== null) return;

    setActualizandoId(pelicula.id);
    setErrorCambio(null);

    try {
      // Actualizamos la puntuación en PostgreSQL.
      const resultado = await actualizarPuntuacion(
        pelicula.id,
        nuevaPuntuacion
      );

      // Actualizamos la película en el estado de React.
      setPeliculas((anteriores) =>
        anteriores.map((item) =>
          item.id === pelicula.id
            ? {
                ...item,
                puntuacion_personal: resultado.puntuacion_personal
              }
            : item
        )
      );

    } catch (error) {
      setErrorCambio(error.message);
    } finally {
      setActualizandoId(null);
    }
  }

  async function manejarEliminar(pelicula) {
    if (actualizandoId !== null) return;

    // Pedimos confirmación antes de eliminar.
    const confirmado = window.confirm(
      `¿Querés eliminar "${pelicula.titulo}" de tu colección?`
    );

    if (!confirmado) return;

    setActualizandoId(pelicula.id);
    setErrorCambio(null);

    try {
      // Eliminamos la película de PostgreSQL.
      await eliminarDeColeccion(pelicula.id);

      // La quitamos también de la lista de React.
      setPeliculas((anteriores) =>
        anteriores.filter((item) => item.id !== pelicula.id)
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
        onCambiarFavorita={manejarCambiarFavorita}
        onCambiarPuntuacion={manejarCambiarPuntuacion}
        onEliminar={manejarEliminar}
      />
    </main>
  );
}

export default CollectionPage;