import { apiRequest } from "./apiClient";

export function obtenerColeccion() {
  return apiRequest("/coleccion/", { requiresAuth: true, message: "No se pudo cargar tu colección" });
}

export function obtenerPeliculaColeccion(id) {
  return apiRequest(`/coleccion/${id}`, { requiresAuth: true, message: "No se pudo cargar la película de tu colección" });
}

export function agregarAColeccion(idTmdb) {
  return apiRequest("/coleccion/", { method: "POST", requiresAuth: true, body: { id_tmdb: idTmdb }, message: "No se pudo agregar la película" }).catch((error) => {
    if (error.status === 409) error.message = "Esta película ya está en tu colección";
    throw error;
  });
}

export function actualizarEstado(id, estado) {
  return apiRequest(`/coleccion/${id}`, { method: "PATCH", requiresAuth: true, body: { estado }, message: "No se pudo actualizar el estado" });
}

export function actualizarFavorita(id, favorita) {
  return apiRequest(`/coleccion/${id}/favorita`, { method: "PATCH", requiresAuth: true, body: { favorita }, message: "No se pudo actualizar el favorito" });
}

export function actualizarPuntuacion(id, puntuacion) {
  return apiRequest(`/coleccion/${id}/puntuacion`, { method: "PATCH", requiresAuth: true, body: { puntuacion_personal: puntuacion }, message: "No se pudo actualizar la puntuación" });
}

export function eliminarDeColeccion(id) {
  return apiRequest(`/coleccion/${id}`, { method: "DELETE", requiresAuth: true, message: "No se pudo eliminar la película" });
}
