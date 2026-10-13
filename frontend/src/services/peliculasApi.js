const API_URL = "http://127.0.0.1:8000";


// Obtiene las películas guardadas desde nuestro backend FastAPI.
export async function obtenerPeliculas() {
  const respuesta = await fetch(`${API_URL}/peliculas/`);

  if (!respuesta.ok) {
    throw new Error("No se pudieron cargar las películas");
  }

  return respuesta.json();
}