import { apiRequest } from "./apiClient";

export function obtenerUsuarioActual() {
  return apiRequest("/usuarios/me", { requiresAuth: true, notifyUnauthorized: false, message: "No se pudo recuperar tu sesión" });
}

export function editarPerfil(cambios) {
  return apiRequest("/usuarios/me", {
    method: "PATCH",
    body: cambios,
    requiresAuth: true,
    message: "No se pudo guardar tu perfil",
  });
}

export function cambiarFotoPerfil(foto) {
  return apiRequest("/usuarios/me/foto", {
    method: foto === null ? "DELETE" : "POST",
    body: foto === null ? undefined : foto,
    requiresAuth: true,
    message: foto === null
      ? "No se pudo quitar tu foto"
      : "No se pudo guardar tu foto",
  });
}


export function obtenerPeliculasDestacadas() {
  return apiRequest("/usuarios/me/peliculas-destacadas", {
    requiresAuth: true,
    message: "No se pudieron cargar tus películas destacadas",
  });
}

export function guardarPeliculaDestacada(posicion, peliculaId) {
  return apiRequest(`/usuarios/me/peliculas-destacadas/${posicion}`, {
    method: "PATCH",
    requiresAuth: true,
    body: { pelicula_id: peliculaId },
    message: "No se pudo guardar el cambio",
  });
}


export function iniciarSesion(email, password) {
  return apiRequest("/usuarios/login", { method: "POST", body: { email, password }, message: "No se pudo iniciar sesión" }).catch((error) => {
    if (error.status === 401) error.message = "Correo electrónico o contraseña incorrectos";
    throw error;
  });
}

export function registrarUsuario(nombre_usuario, email, password) {
  return apiRequest("/usuarios/registro", { method: "POST", body: { nombre_usuario, email, password }, message: "No se pudo crear tu cuenta" }).catch((error) => {
    if (error.status === 409) error.message = "El nombre de usuario o correo ya está registrado";
    throw error;
  });
}

export function cerrarSesion() {
  return apiRequest("/usuarios/logout", { method: "POST", requiresAuth: true, message: "No se pudo cerrar la sesión" });
}

export function verificarEmail(email, codigo) {
  return apiRequest("/usuarios/verificar-email", {
    method: "POST", body: { email, codigo }, message: "No se pudo verificar tu correo",
  }).catch((error) => {
    // El backend responde lo mismo ante código erróneo, vencido o agotado.
    if (error.status === 400) error.message = "El código es inválido, venció o se agotaron los intentos. Revisalo o solicitá otro";
    throw error;
  });
}

export function reenviarVerificacion(email) {
  return apiRequest("/usuarios/reenviar-verificacion", {
    method: "POST", body: { email }, message: "No se pudo solicitar otro código",
  });
}

export function solicitarRecuperacionPassword(email) {
  return apiRequest("/usuarios/recuperar-password", {
    method: "POST", body: { email }, message: "No se pudo solicitar el enlace",
  });
}

export function restablecerPassword(token, password) {
  return apiRequest("/usuarios/restablecer-password", {
    method: "POST", body: { token, password }, message: "No se pudo actualizar la contraseña",
  });
}


export function iniciarIntentoGoogle() {
  return apiRequest("/usuarios/google/intento", {
    method: "POST",
    message: "No se pudo preparar el acceso con Google",
  });
}

export function enviarCredencialGoogle(credencial) {
  return apiRequest("/usuarios/google/credencial", {
    method: "POST",
    body: { credencial },
    message: "No se pudo iniciar sesión con Google",
  });
}


export function completarAltaGoogle(nombreUsuario) {
  return apiRequest("/usuarios/google/alta", {
    method: "POST",
    body: { nombre_usuario: nombreUsuario },
    message: "No se pudo crear tu cuenta con Google",
  });
}

export function obtenerEstadoVinculacionGoogle() {
  return apiRequest("/usuarios/google/vincular", {
    requiresAuth: true,
    message: "No se pudo comprobar el vínculo con Google",
  });
}

export function iniciarVinculacionGoogle() {
  return apiRequest("/usuarios/google/vincular/intento", {
    method: "POST",
    requiresAuth: true,
    message: "No se pudo iniciar la vinculación con Google",
  });
}

export function confirmarVinculacionGoogle(credencial, password) {
  return apiRequest("/usuarios/google/vincular", {
    method: "POST",
    requiresAuth: true,
    body: { credencial, password },
    message: "No se pudo vincular esta cuenta de Google",
  });
}


