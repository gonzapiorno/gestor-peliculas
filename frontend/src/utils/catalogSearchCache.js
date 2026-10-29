import { buscarPeliculas } from "../services/catalogoApi.js";

// Sólo metadatos públicos del catálogo; nunca datos de una colección o sesión.
export function createCatalogSearchCache(search, { ttl = 30000, limit = 20, now = Date.now } = {}) {
  const entries = new Map();
  return function cachedSearch(title, { fresh = false } = {}) {
    const key = title.trim();
    const previous = entries.get(key);
    if (!fresh && previous && (previous.pending || previous.expires > now())) {
      entries.delete(key);
      entries.set(key, previous);
      return previous.promise;
    }
    const entry = { pending: true, expires: 0, promise: null };
    entry.promise = Promise.resolve().then(() => search(key)).then((results) => {
      entry.pending = false;
      entry.expires = now() + ttl;
      return results;
    }).catch((error) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    });
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > limit) entries.delete(entries.keys().next().value);
    return entry.promise;
  };
}

export const searchCatalog = createCatalogSearchCache(buscarPeliculas);
