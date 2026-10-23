import { apiRequest } from "./apiClient";

export function obtenerUsuarioActual() {
  return apiRequest("/usuarios/me", { requiresAuth: true, notifyUnauthorized: false, message: "No se pudo recuperar tu sesión" });
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
