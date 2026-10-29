export function collectionStatistics(peliculas) {
  let vistas = 0;
  let favoritas = 0;
  let totalNotas = 0;
  let puntuadas = 0;
  for (const pelicula of peliculas) {
    if (pelicula.estado === "vista") vistas += 1;
    if (pelicula.favorita === true) favoritas += 1;
    const nota = pelicula.puntuacion_personal;
    if (typeof nota === "number" && Number.isFinite(nota) && nota >= 1 && nota <= 10 && Number.isInteger(nota * 2)) {
      totalNotas += nota;
      puntuadas += 1;
    }
  }
  return { todas: peliculas.length, vistas, pendientes: peliculas.length - vistas, favoritas, puntuadas, promedio: puntuadas ? totalNotas / puntuadas : null };
}
