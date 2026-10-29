import MovieCard from "./MovieCard";
import MovieListItem from "./MovieListItem";
import "./MovieGrid.css";


function MovieGrid({ peliculas, viewMode = "grid", onCambiarEstado, onCambiarFavorita, onCambiarPuntuacion, onEliminar, actualizandoIds = new Set() }) {
  const Card = viewMode === "list" ? MovieListItem : MovieCard;
  return (
    <section className={viewMode === "list" ? "movie-list" : "movie-grid"} aria-label="Películas de mi colección">
      {peliculas.map((pelicula) => (
        <Card
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
