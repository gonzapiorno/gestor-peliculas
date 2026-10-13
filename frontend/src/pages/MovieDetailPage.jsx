import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { obtenerDetallePelicula } from "../services/catalogoApi";

import "./MovieDetailPage.css";


function MovieDetailPage() {
  const { id } = useParams();

  const [pelicula, setPelicula] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Consultamos el detalle cuando cambia el ID de la URL.
  useEffect(() => {
    async function cargarDetalle() {
      try {
        const datos = await obtenerDetallePelicula(id);
        setPelicula(datos);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    }

    cargarDetalle();
  }, [id]);

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

        <button className="movie-detail__add">
          Agregar a mi colección
        </button>

      </section>

    </main>
  );
}

export default MovieDetailPage;