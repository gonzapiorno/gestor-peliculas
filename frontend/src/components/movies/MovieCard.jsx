function MovieCard({ pelicula, onCambiarEstado, onCambiarFavorita, onCambiarPuntuacion, onEliminar, actualizando }) {
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

      <button
        type="button"
        onClick={() => onCambiarFavorita(pelicula)}
        disabled={actualizando}
        aria-pressed={pelicula.favorita}
      >
        {pelicula.favorita
          ? "♥ Quitar de favoritos"
          : "♡ Agregar a favoritos"}
      </button>

      <label>
        Tu puntuación:

        <select
          value={pelicula.puntuacion_personal ?? ""}
          disabled={actualizando}
          onChange={(evento) => {
            const valor = evento.target.value;

            onCambiarPuntuacion(
              pelicula,
              valor === "" ? null : Number(valor)
            );
          }}
        >
          <option value="">Sin puntuar</option>

          {Array.from({ length: 19 }, (_, i) => i * 0.5 + 1).map(
            (nota) => (
              <option key={nota} value={nota}>
                {nota}/10
              </option>
            )
          )}
        </select>
      </label>

      <button
        type="button"
        onClick={() => onEliminar(pelicula)}
        disabled={actualizando}
      >
        Eliminar de mi colección
      </button>
    </article>
  );
}

export default MovieCard;