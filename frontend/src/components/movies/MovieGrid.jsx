import MovieCard from "./MovieCard";


function MovieGrid({ peliculas, onCambiarEstado, actualizando }) {
  return (
    <section>
      {peliculas.map((pelicula) => (
        <MovieCard
          key={pelicula.id}
          pelicula={pelicula}
          onCambiarEstado={onCambiarEstado}
          actualizando={actualizando}
        />
      ))}
    </section>
  );
}

export default MovieGrid;