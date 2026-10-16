function MovieCard({ pelicula, onCambiarEstado, actualizando }) {
  return (
    <article>
      {/* Póster de la película */}
      {pelicula.poster ? (
        <img
          src={pelicula.poster}
          alt={`Póster de ${pelicula.titulo}`}
          style={{
            width: "180px",
            aspectRatio: "2 / 3",
            objectFit: "cover"
          }}
        />
      ) : (
        <p>Sin póster disponible</p>
      )}

      {/* Información de la película */}
      <h3>{pelicula.titulo}</h3>

      <p>Año: {pelicula.anio ?? "Desconocido"}</p>

      <p>
        Estado: {pelicula.estado === "vista" ? "Vista" : "Pendiente"}
      </p>

      <p>
        Tu puntuación:{" "}
        {pelicula.puntuacion_personal === null
          ? "Sin puntuar"
          : `${pelicula.puntuacion_personal}/10`}
      </p>

      <button
        type="button"
        onClick={() => onCambiarEstado(pelicula)}
        disabled={actualizando}
      >
        {actualizando
          ? "Guardando..."
          : pelicula.estado === "vista"
            ? "Marcar como pendiente"
            : "Marcar como vista"}
      </button>

      {pelicula.favorita && <p>♥ Favorita</p>}
    </article>
  );
}

export default MovieCard;