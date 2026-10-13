function MovieCard({ pelicula }) {
  return (
    <article>
      <h3>{pelicula.nombre}</h3>

      <p>
        {pelicula.anio} · {pelicula.genero}
      </p>

      <p>
        Tu puntuación: {pelicula.puntuacion}/10
      </p>
    </article>
  );
}

export default MovieCard;