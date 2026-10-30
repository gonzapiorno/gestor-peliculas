export function safeAuthDestination(from, origin = globalThis.location?.origin || "http://muvis.local") {
  const route = typeof from === "string" ? from : from && typeof from.pathname === "string"
    ? `${from.pathname}${typeof from.search === "string" ? from.search : ""}${typeof from.hash === "string" ? from.hash : ""}` : "";
  const unsafe = (value) => value.includes("\\") || [...value].some((char) => char.charCodeAt(0) < 32);
  if (!route.startsWith("/") || route.startsWith("//") || unsafe(route)) return "/coleccion";
  try {
    const url = new URL(route, origin);
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "");
    if (url.origin !== origin || path.startsWith("//") || unsafe(path)
      || /^\/(login|registro|verificar-email)(\/|$)/i.test(path)) return "/coleccion";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/coleccion"; }
}

export function validateAuthFields(fields, register = false) {
  const errors = {};
  if (register && !/^[a-zA-Z0-9_]{3,30}$/.test(fields.nombre_usuario.trim())) errors.nombre_usuario = "Usá entre 3 y 30 letras, números o guiones bajos, sin espacios ni acentos.";
  if (!/^[^\s@]+@[^\s@]+$/.test(fields.email.trim())) errors.email = "Ingresá un correo electrónico válido.";
  if (!fields.password) errors.password = "Ingresá tu contraseña.";
  else if (register && (Array.from(fields.password).length < 12 || Array.from(fields.password).length > 128)) errors.password = "La contraseña debe tener entre 12 y 128 caracteres.";
  if (register && fields.confirmacion !== fields.password) errors.confirmacion = "Las contraseñas no coinciden.";
  return errors;
}

export function normalizeVerificationCode(value) { return value.replace(/[^0-9]/g, "").slice(0, 6); }

// Ayuda visual en memoria. El servidor siempre decide si permite emitir.
export function createVerificationCooldown() {
  const deadlines = new Map();
  return {
    start(email, seconds = 60, now = Date.now()) {
      const key = email.trim().toLowerCase();
      deadlines.set(key, Math.max(deadlines.get(key) || 0, now + Math.max(0, seconds) * 1000));
      if (deadlines.size > 50) deadlines.delete(deadlines.keys().next().value);
    },
    remaining(email, now = Date.now()) { return Math.max(0, Math.ceil(((deadlines.get(email.trim().toLowerCase()) || 0) - now) / 1000)); },
  };
}

export const verificationCooldown = createVerificationCooldown();
