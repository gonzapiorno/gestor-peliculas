import { apiRequest } from "./apiClient";

export async function obtenerPaginaCatalogo(categoria, pagina, decada) {
  const params = new URLSearchParams({ categoria, pagina });
  if (decada != null) params.set("decada", decada);
  const datos = await apiRequest(`/catalogo/explorar?${params}`, { message: "No se pudo cargar el catálogo" });
  if (decada != null && datos.decada !== decada) {
    throw new Error("El filtro por década todavía no está disponible");
  }
  return datos;
}

export function obtenerDetallePelicula(idTmdb) {
  return apiRequest(`/catalogo/peliculas/${idTmdb}`, { message: "No se pudo cargar la película" });
}

export function buscarPeliculas(titulo) {
  return apiRequest(`/catalogo/buscar?titulo=${encodeURIComponent(titulo)}`, { message: "No se pudieron buscar las películas" });
}
