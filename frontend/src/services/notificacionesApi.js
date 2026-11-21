import { apiRequest } from "./apiClient";

const ruta = "/notificaciones";

export function obtenerPreferenciasNotificaciones() {
  return apiRequest(ruta, { requiresAuth: true, message: "No pudimos cargar tus ajustes de notificaciones." });
}

export function guardarPreferenciasNotificaciones(preferencias) {
  return apiRequest(ruta, { method: "PATCH", body: preferencias, requiresAuth: true,
    message: "No pudimos guardar tus preferencias." });
}

export function guardarDispositivo(suscripcion) {
  const { endpoint, keys } = suscripcion.toJSON();
  return apiRequest(`${ruta}/dispositivos`, {
    method: "POST", body: { endpoint, keys }, requiresAuth: true,
    message: "No pudimos activar las notificaciones en este dispositivo.",
  });
}

export function quitarDispositivo(endpoint) {
  return apiRequest(`${ruta}/dispositivos`, {
    method: "DELETE", body: { endpoint }, requiresAuth: true,
    message: "No pudimos desactivar las notificaciones en este dispositivo.",
  });
}
