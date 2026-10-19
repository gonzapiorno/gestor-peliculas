const API_URL = "http://127.0.0.1:8000";

// Recupera las películas guardadas en nuestra colección.
export async function obtenerColeccion() {
  const respuesta = await fetch(`${API_URL}/coleccion/`);

  if (!respuesta.ok) {
    throw new Error("No se pudo cargar tu colección");
  }

  return respuesta.json();
}

// Recupera una película por su identificador interno de la colección.
export async function obtenerPeliculaColeccion(id) {
  const respuesta = await fetch(`${API_URL}/coleccion/${id}`);

  if (!respuesta.ok) {
    const error = new Error(respuesta.status === 404
      ? "Esta película no está en tu colección"
      : "No se pudo cargar la película de tu colección");
    error.status = respuesta.status;
    throw error;
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

// Marca o desmarca una película como favorita.
export async function actualizarFavorita(id, favorita) {
  const respuesta = await fetch(`${API_URL}/coleccion/${id}/favorita`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ favorita }),
  });

  if (!respuesta.ok) {
    throw new Error("No se pudo actualizar el favorito");
  }

  return respuesta.json();
}


// Actualiza la puntuación personal de una película.
export async function actualizarPuntuacion(id, puntuacion) {
  const respuesta = await fetch(`${API_URL}/coleccion/${id}/puntuacion`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      puntuacion_personal: puntuacion,
    }),
  });

  if (!respuesta.ok) {
    throw new Error("No se pudo actualizar la puntuación");
  }

  return respuesta.json();
}


// Elimina una película de nuestra colección.
export async function eliminarDeColeccion(id) {
  const respuesta = await fetch(`${API_URL}/coleccion/${id}`, {
    method: "DELETE",
  });

  if (!respuesta.ok) {
    throw new Error("No se pudo eliminar la película");
  }
}


