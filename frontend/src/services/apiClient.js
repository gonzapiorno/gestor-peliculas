const configuredUrl = import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000";
const base = new URL(configuredUrl);
if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
  throw new Error("VITE_API_URL debe ser una URL HTTP(S) sin credenciales, parámetros ni fragmentos");
}
export const API_URL = base.href.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, { code = null, retryAfter = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code === "EMAIL_NO_VERIFICADO" ? code : null;
    this.retryAfter = retryAfter;
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

function responseMessage(status, detail, fallback, code) {
  if (status >= 500) return "El servidor no pudo completar la operación. Intentá de nuevo";
  if (status === 401) return "Tu sesión terminó. Iniciá sesión para continuar";
  if (status === 403 && code === "EMAIL_NO_VERIFICADO") return "Verificá tu correo electrónico para continuar";
  if (status === 403) return detail === "Origen de la petición no permitido"
    ? "El servidor no permite este origen. Revisá que estés usando la dirección de React autorizada"
    : "No se pudo verificar la seguridad de esta operación. Actualizá la página e intentá de nuevo";
  if (status === 422) return "Revisá los datos ingresados y los requisitos de cada campo";
  if (status === 429) return "Demasiadas solicitudes. Esperá un momento antes de volver a intentar";
  return fallback;
}

// Sólo conservamos el código público conocido y una espera acotada. Nunca el
// cuerpo de error remoto, que puede incluir credenciales o detalles internos.
function retryAfterSeconds(response) {
  const value = response.headers?.get?.("Retry-After")?.trim();
  if (!value) return null;
  let seconds;
  if (/^\d+$/.test(value)) seconds = Number(value);
  else {
    if (!/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) return null;
    const date = Date.parse(value);
    if (!Number.isFinite(date)) return null;
    seconds = Math.ceil((date - Date.now()) / 1000);
  }
  if (!Number.isFinite(seconds)) return null;
  return Math.min(86400, Math.max(0, seconds));
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
    const code = response.status === 403 && detail?.codigo === "EMAIL_NO_VERIFICADO" ? "EMAIL_NO_VERIFICADO" : null;
    throw new ApiError(responseMessage(response.status, detail, message, code), response.status, {
      code, retryAfter: retryAfterSeconds(response),
    });
  }
  if (response.status === 204) return null;
  let data;
  try { data = await response.json(); } catch { throw new ApiError("El servidor devolvió una respuesta que no pudimos interpretar", response.status); }
  if (requiresAuth && revision !== sessionRevision) throw new ApiError("La sesión cambió. Intentá de nuevo", 401);
  return data;
}
