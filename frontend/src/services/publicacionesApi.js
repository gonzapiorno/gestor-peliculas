import { apiRequest } from "./apiClient";

const publicaciones = "/publicaciones";

export function obtenerMuro(antesDe) {
  const query = antesDe == null ? "" : `?antes_de=${antesDe}`;
  return apiRequest(publicaciones + query, {
    requiresAuth: true,
    message: "No pudimos cargar las publicaciones.",
  });
}

export function obtenerPublicacion(id) {
  return apiRequest(`${publicaciones}/${id}`, {
    requiresAuth: true,
    message: "No pudimos abrir esta publicación.",
  });
}

export function crearPublicacion(datos) {
  return apiRequest(publicaciones, {
    method: "POST",
    requiresAuth: true,
    body: datos,
    message: "No pudimos publicar la película.",
  });
}

export function cambiarMeGusta(id, agregar) {
  return apiRequest(`${publicaciones}/${id}/me-gusta`, {
    method: agregar ? "POST" : "DELETE",
    requiresAuth: true,
    message: "No pudimos cambiar tu Me gusta.",
  });
}

export function obtenerComentarios(id, despuesDe) {
  const query = despuesDe == null ? "" : `?despues_de=${despuesDe}`;
  return apiRequest(`${publicaciones}/${id}/comentarios${query}`, {
    requiresAuth: true,
    message: "No pudimos cargar los comentarios.",
  });
}

export function crearComentario(id, contenido) {
  return apiRequest(`${publicaciones}/${id}/comentarios`, {
    method: "POST",
    requiresAuth: true,
    body: { contenido },
    message: "No pudimos enviar tu comentario.",
  });
}
