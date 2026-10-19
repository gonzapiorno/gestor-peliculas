export const COLLECTION_CHANGED_EVENT = "muvis:collection-changed";

export function notificarCambioColeccion(tipo, idTmdb) {
  window.dispatchEvent(new CustomEvent(COLLECTION_CHANGED_EVENT, { detail: { tipo, idTmdb } }));
}
