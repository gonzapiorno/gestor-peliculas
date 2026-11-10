import { apiRequest } from "./apiClient";

export function enviarFeedback(datos) {
  return apiRequest("/feedback", {
    method: "POST",
    requiresAuth: true,
    body: datos,
    message: "No se pudo enviar el feedback.",
  });
}