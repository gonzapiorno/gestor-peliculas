const configuredUrl = import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000";
const base = new URL(configuredUrl);
if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
  throw new Error("VITE_API_URL debe ser una URL HTTP(S) sin credenciales, parámetros ni fragmentos");
}
export const API_URL = base.href.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let csrfToken = null;
let csrfRequest = null;
let sessionRevision = 0;
const sessionListeners = new Set();

export function resetSessionSecurity() {
  csrfToken = null;
  csrfRequest = null;
  return ++sessionRevision;
}

export function onSessionExpired(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function expireSession(revision) {
  if (revision !== sessionRevision) return;
  resetSessionSecurity();
  sessionListeners.forEach((listener) => listener());
}

function responseMessage(status, detail, fallback) {
  if (status >= 500) return "El servidor no pudo completar la operación. Intentá de nuevo";
  if (status === 401) return "Tu sesión terminó. Iniciá sesión para continuar";
  if (status === 403) return detail === "Origen de la petición no permitido"
    ? "El servidor no permite este origen. Revisá que estés usando la dirección de React autorizada"
    : "No se pudo verificar la seguridad de esta operación. Actualizá la página e intentá de nuevo";
  if (status === 422) return "Revisá los datos ingresados y los requisitos de cada campo";
  return fallback;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (csrfRequest) return csrfRequest;
  const revision = sessionRevision;
  const pending = apiRequest("/usuarios/csrf", { requiresAuth: true, message: "No se pudo verificar la seguridad de la sesión" })
    .then((data) => {
      if (revision !== sessionRevision) throw new ApiError("La sesión cambió. Intentá de nuevo", 401);
      if (typeof data?.csrf_token !== "string" || !data.csrf_token) throw new ApiError("El servidor no devolvió la protección CSRF esperada");
      csrfToken = data.csrf_token;
      return csrfToken;
    })
    .finally(() => { if (csrfRequest === pending) csrfRequest = null; });
  csrfRequest = pending;
  return pending;
}

// La cookie sólo la administra el navegador; CSRF permanece únicamente en memoria.
export async function apiRequest(path, {
  method = "GET", body, requiresAuth = false, notifyUnauthorized = true,
  message = "No se pudo completar la operación", csrf = requiresAuth && !["GET", "HEAD"].includes(method),
} = {}) {
  const revision = sessionRevision;
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (csrf) headers.set("X-CSRF-Token", await getCsrfToken());
  if (requiresAuth && revision !== sessionRevision) throw new ApiError("La sesión cambió. Intentá de nuevo", 401);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method, headers, credentials: "include", cache: "no-store",
      signal: AbortSignal.timeout(20000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    throw new ApiError(error.name === "TimeoutError" || error.name === "AbortError"
      ? "El servidor tardó demasiado en responder. Intentá de nuevo"
      : "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo");
  }
  if (requiresAuth && revision !== sessionRevision) throw new ApiError("La sesión cambió. Intentá de nuevo", 401);
  if (!response.ok) {
    let detail;
    try { detail = (await response.json())?.detail; } catch { /* Puede no haber JSON. */ }
    if (requiresAuth && revision !== sessionRevision) throw new ApiError("La sesión cambió. Intentá de nuevo", 401);
    if (response.status === 401 && requiresAuth && notifyUnauthorized) expireSession(revision);
    // Un 403 nunca repite una escritura automáticamente.
    if (response.status === 403) csrfToken = null;
    throw new ApiError(responseMessage(response.status, detail, message), response.status);
  }
  if (response.status === 204) return null;
  let data;
  try { data = await response.json(); } catch { throw new ApiError("El servidor devolvió una respuesta que no pudimos interpretar", response.status); }
  if (requiresAuth && revision !== sessionRevision) throw new ApiError("La sesión cambió. Intentá de nuevo", 401);
  return data;
}
