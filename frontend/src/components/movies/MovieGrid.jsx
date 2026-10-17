import MovieCard from "./MovieCard";
import "./MovieGrid.css";


function MovieGrid({ peliculas, onCambiarEstado, onCambiarFavorita, onCambiarPuntuacion, onEliminar, actualizandoIds = new Set() }) {
  return (
    <section className="movie-grid" aria-label="Películas de mi colección">
      {peliculas.map((pelicula) => (
        <MovieCard
          key={pelicula.id}
          pelicula={pelicula}
          onCambiarEstado={onCambiarEstado}
          onCambiarFavorita={onCambiarFavorita}
          onCambiarPuntuacion={onCambiarPuntuacion}
          onEliminar={onEliminar}
          actualizando={actualizandoIds.has(pelicula.id)}
        />
      ))}
    </section>
  );
}

export default MovieGrid;
