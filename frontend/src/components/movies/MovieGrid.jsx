import MovieCard from "./MovieCard";


function MovieGrid({ peliculas, onCambiarEstado, onCambiarFavorita, onCambiarPuntuacion, onEliminar, actualizando }) {
  return (
    <section>
      {peliculas.map((pelicula) => (
        <MovieCard
          key={pelicula.id}
          pelicula={pelicula}
          onCambiarEstado={onCambiarEstado}
          onCambiarFavorita={onCambiarFavorita}
          onCambiarPuntuacion={onCambiarPuntuacion}
          onEliminar={onEliminar}
          actualizando={actualizando}
        />
      ))}
    </section>
  );
}

export default MovieGrid;