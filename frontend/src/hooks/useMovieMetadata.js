import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerDetallePelicula } from "../services/catalogoApi";
import { createMovieMetadataCache } from "./movieMetadataCache";

const cache = createMovieMetadataCache(obtenerDetallePelicula);
const empty = { status: "idle", data: null, error: null };

export default function useMovieMetadata(id, targetRef) {
  const [state, setState] = useState(() => ({ id, ...(cache.read(id) || empty) }));
  const subscriptionRef = useRef(null);

  const load = useCallback((retry = false) => {
    subscriptionRef.current?.();
    subscriptionRef.current = cache.subscribe(id, (value) => setState({ id, ...value }), { retry });
  }, [id]);

  useEffect(() => {
    const node = targetRef.current;
    let observer;
    let active = true;
    // Sin observer se ofrece un botón explícito, evitando descargar una biblioteca entera.
    if (node && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        if (!active) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          if (!subscriptionRef.current) load();
        } else {
          subscriptionRef.current?.();
          subscriptionRef.current = null;
        }
      }, { rootMargin: "160px 0px" });
      observer.observe(node);
    }
    return () => {
      active = false;
      observer?.disconnect();
      subscriptionRef.current?.();
      subscriptionRef.current = null;
    };
  }, [load, targetRef]);

  return { ...(state.id === id ? state : cache.read(id) || empty), load: () => load(), retry: () => load(true) };
}
