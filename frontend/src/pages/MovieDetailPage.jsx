import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { obtenerDetallePelicula } from "../services/catalogoApi";
import {
  agregarAColeccion,
  obtenerColeccion
} from "../services/coleccionApi";

import "./MovieDetailPage.css";


function MovieDetailPage() {
  const { id } = useParams();

  const [pelicula, setPelicula] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Indica si la película ya está guardada.
  const [enColeccion, setEnColeccion] = useState(false);

  // Indica si estamos esperando la respuesta del POST.
  const [agregando, setAgregando] = useState(false);

  // Mensaje para informar el resultado.
  const [mensaje, setMensaje] = useState("");

  // Consultamos el detalle cuando cambia el ID de la URL.
  useEffect(() => {
    let cancelado = false;

    async function cargarDetalle() {
      setCargando(true);
      setError(null);
      setEnColeccion(false);
      setMensaje("");

      try {
        // Recuperamos los detalles y nuestra colección.
        const [datosPelicula, datosColeccion] = await Promise.all([
          obtenerDetallePelicula(id),
          obtenerColeccion()
        ]);

        if (cancelado) return;

        setPelicula(datosPelicula);

        // Buscamos si este ID de TMDB ya está guardado.
        const existe = datosColeccion.some(
          (pelicula) => pelicula.id_tmdb === Number(id)
        );

        setEnColeccion(existe);

      } catch (error) {
        if (!cancelado) {
          setError(error.message);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargarDetalle();

    return () => {
      cancelado = true;
    };
  }, [id]);

  async function manejarAgregar() {
    if (!pelicula || agregando || enColeccion) return;

    setAgregando(true);
    setMensaje("");

    try {
      // Enviamos el ID de TMDB a nuestro backend.
      await agregarAColeccion(pelicula.id_tmdb);

      // Actualizamos la interfaz si salió bien.
      setEnColeccion(true);
      setMensaje("¡Película agregada correctamente!");

    } catch (error) {
      if (error.message === "Esta película ya está en tu colección") {
        setEnColeccion(true);
        setMensaje("Esta película ya estaba guardada.");
      } else {
        setMensaje(error.message);
      }
    } finally {
      setAgregando(false);
    }
  }

  if (cargando) {
    return <p>Cargando película...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!pelicula) {
    return null;
  }

  return (
    <main className="movie-detail">

      <div className="movie-detail__poster">
        {pelicula.poster && (
          <img
            src={pelicula.poster}
            alt={`Poster de ${pelicula.titulo}`}
          />
        )}
      </div>

      <section className="movie-detail__content">

        <span className="movie-detail__eyebrow">
          DETALLE
        </span>

        <h2>{pelicula.titulo}</h2>

        <div className="movie-detail__meta">
          <span>{pelicula.anio}</span>

          {pelicula.duracion && (
            <span>{pelicula.duracion} min</span>
          )}

          <span>★ {pelicula.puntuacion}</span>
        </div>

        <div className="movie-detail__genres">
          {pelicula.generos.map((genero) => (
            <span key={genero}>
              {genero}
            </span>
          ))}
        </div>

        <p className="movie-detail__overview">
          {pelicula.sinopsis || "Sin sinopsis disponible."}
        </p>

        <button
          type="button"
          className="movie-detail__add"
          onClick={manejarAgregar}
          disabled={agregando || enColeccion}
        >
          {agregando
            ? "Agregando..."
            : enColeccion
              ? "✓ En mi colección"
              : "Agregar a mi colección"}
        </button>

        {mensaje && (
          <p role="status" className="movie-detail__message">
            {mensaje}
          </p>
        )}

      </section>

    </main>
  );
}

export default MovieDetailPage;