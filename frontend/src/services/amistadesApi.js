import { apiRequest } from "./apiClient";

const solicitudes = "/amistades/solicitudes";

export function buscarUsuario(usuario) {
  const params = new URLSearchParams({ usuario });
  return apiRequest(`/amistades/buscar?${params}`, {
    requiresAuth: true,
    message: "No pudimos buscar ese usuario.",
  });
}

export function obtenerAmistades() {
  return apiRequest(solicitudes, {
    requiresAuth: true,
    message: "No pudimos cargar tus amistades.",
  });
}

export function enviarSolicitud(destinatarioId) {
  return apiRequest(solicitudes, {
    method: "POST",
    requiresAuth: true,
    body: { destinatario_id: destinatarioId },
    message: "No pudimos enviar la solicitud.",
  });
}

export function responderSolicitud(solicitudId, estado) {
  return apiRequest(`${solicitudes}/${solicitudId}`, {
    method: "PATCH",
    requiresAuth: true,
    body: { estado },
    message: "No pudimos responder la solicitud.",
  });
}
