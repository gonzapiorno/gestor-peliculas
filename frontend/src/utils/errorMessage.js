export function errorMessage(error) {
  if (error instanceof TypeError) return "No pudimos conectar con el servidor";
  return error?.message || "Ocurrió un error. Intentá de nuevo";
}
