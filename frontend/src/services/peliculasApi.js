import { apiRequest } from "./apiClient";


// Obtiene las películas guardadas desde nuestro backend FastAPI.
export async function obtenerPeliculas() {
  return apiRequest("/peliculas/", { message: "No se pudieron cargar las películas" });
}
