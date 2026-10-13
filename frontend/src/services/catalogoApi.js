const API_URL = "http://127.0.0.1:8000";


// Obtiene películas populares desde nuestro backend.
// El frontend nunca habla directamente con TMDB.
export async function obtenerPopulares() {
  const respuesta = await fetch(`${API_URL}/catalogo/populares`);

  if (!respuesta.ok) {
    throw new Error("No se pudo cargar el catálogo");
  }

  return respuesta.json();
}

// Obtiene el detalle completo de una película del catálogo.
export async function obtenerDetallePelicula(idTmdb) {
  const respuesta = await fetch(
    `${API_URL}/catalogo/peliculas/${idTmdb}`
  );

  if (!respuesta.ok) {
    throw new Error("No se pudo cargar la película");
  }

  return respuesta.json();
}