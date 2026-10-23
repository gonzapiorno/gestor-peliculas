import { apiRequest } from "./apiClient";

export function obtenerPopulares() {
  return apiRequest("/catalogo/populares", { message: "No se pudo cargar el catálogo" });
}

export function obtenerDetallePelicula(idTmdb) {
  return apiRequest(`/catalogo/peliculas/${idTmdb}`, { message: "No se pudo cargar la película" });
}

export function buscarPeliculas(titulo) {
  return apiRequest(`/catalogo/buscar?titulo=${encodeURIComponent(titulo)}`, { message: "No se pudieron buscar las películas" });
}
