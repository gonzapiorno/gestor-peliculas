import MovieCard from "./MovieCard";


function MovieGrid({ peliculas }) {
  return (
    <section>
      {peliculas.map((pelicula) => (
        <MovieCard
          key={pelicula.id_pelicula}
          pelicula={pelicula}
        />
      ))}
    </section>
  );
}

export default MovieGrid;