// Esta caché contiene únicamente metadatos públicos del catálogo. Nunca filas de colección.
export function createMovieMetadataCache(load, { concurrency = 3, maxEntries = 120, ttl = 15 * 60 * 1000, now = Date.now } = {}) {
  const entries = new Map();
  const queue = [];
  const limit = Math.min(3, Math.max(1, concurrency));
  let active = 0;

  function validId(id) {
    return Number.isSafeInteger(id) && id > 0;
  }

  function publicMetadata(data) {
    return {
      generos: Array.isArray(data?.generos) ? data.generos.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [],
      duracion: Number.isFinite(data?.duracion) && data.duracion > 0 ? data.duracion : null,
      sinopsis: typeof data?.sinopsis === "string" && data.sinopsis.trim() ? data.sinopsis.trim() : null,
    };
  }

  function snapshot(entry) {
    return { status: entry.status, data: entry.data, error: entry.error };
  }

  function notify(entry) {
    const value = snapshot(entry);
    entry.listeners.forEach((listener) => listener(value));
  }

  function trim() {
    if (entries.size <= maxEntries) return;
    const unused = [...entries.entries()]
      .filter(([, entry]) => entry.listeners.size === 0 && !["loading", "queued"].includes(entry.status))
      .sort((a, b) => a[1].used - b[1].used);
    for (const [id] of unused) {
      if (entries.size <= maxEntries) break;
      entries.delete(id);
    }
  }

  function pump() {
    while (active < limit && queue.length) {
      const entry = queue.shift();
      if (entry.status !== "queued" || entry.listeners.size === 0) continue;
      entry.status = "loading";
      active += 1;
      notify(entry);
      Promise.resolve().then(() => load(entry.id)).then((data) => {
        entry.data = publicMetadata(data);
        entry.error = null;
        entry.status = "success";
        entry.updated = now();
      }).catch(() => {
        entry.data = null;
        entry.error = "No pudimos cargar la información de esta película.";
        entry.status = "error";
      }).finally(() => {
        active -= 1;
        entry.used = now();
        notify(entry);
        trim();
        pump();
      });
    }
  }

  function read(id) {
    const entry = entries.get(Number(id));
    if (!entry) return null;
    if (entry.status === "success" && now() - entry.updated >= ttl) return null;
    return snapshot(entry);
  }

  function subscribe(rawId, listener, { retry = false } = {}) {
    const id = Number(rawId);
    if (!validId(id)) return () => {};
    let entry = entries.get(id);
    if (!entry) {
      entry = { id, status: "idle", data: null, error: null, updated: 0, used: now(), listeners: new Set() };
      entries.set(id, entry);
    }
    entry.used = now();
    entry.listeners.add(listener);
    const expired = entry.status === "success" && now() - entry.updated >= ttl;
    if (entry.status === "idle" || expired || (retry && entry.status === "error")) {
      entry.status = "queued";
      entry.error = null;
      queue.push(entry);
    }
    listener(snapshot(entry));
    pump();
    trim();
    return () => {
      entry.listeners.delete(listener);
      if (entry.listeners.size === 0 && entry.status === "queued") {
        entry.status = "idle";
        const index = queue.indexOf(entry);
        if (index !== -1) queue.splice(index, 1);
      }
      trim();
    };
  }

  return { read, subscribe };
}
