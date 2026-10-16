const API_URL = "http://127.0.0.1:8000";

// Recupera las películas guardadas en nuestra colección.
export async function obtenerColeccion() {
  const respuesta = await fetch(`${API_URL}/coleccion/`);

  if (!respuesta.ok) {
    throw new Error("No se pudo cargar tu colección");
  }

  return respuesta.json();
}

// Agrega una película de TMDB a nuestra colección.
export async function agregarAColeccion(idTmdb) {
  const respuesta = await fetch(`${API_URL}/coleccion/`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      id_tmdb: idTmdb,
    }),
  });

  if (!respuesta.ok) {
    if (respuesta.status === 409) {
      throw new Error("Esta película ya está en tu colección");
    }

    throw new Error("No se pudo agregar la película");
  }

  return respuesta.json();
}


// Actualiza el estado de una película guardada.
export async function actualizarEstado(id, estado) {
  const respuesta = await fetch(`${API_URL}/coleccion/${id}`, {
    method: "PATCH",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      estado: estado,
    }),
  });

  if (!respuesta.ok) {
    throw new Error("No se pudo actualizar el estado");
  }

  return respuesta.json();
}

