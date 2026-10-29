import { useEffect, useRef, useState } from "react";
import { searchCatalog } from "../utils/catalogSearchCache";
import { errorMessage } from "../utils/errorMessage";

export default function useMovieSearch(initialQuery = "") {
  const [query, setQueryState] = useState(initialQuery);
  const [previousInitial, setPreviousInitial] = useState(initialQuery);
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState(null);
  const generation = useRef(0);
  const forceFresh = useRef(false);
  if (initialQuery !== previousInitial) {
    setPreviousInitial(initialQuery);
    setQueryState(initialQuery);
    setRevision((value) => value + 1);
  }
  const eligible = query.trim().length >= 2;
  const current = response?.query === query && response?.revision === revision;

  function setQuery(value) {
    if (value === query) return;
    // Invalidar antes del efecto evita aplicar una respuesta entre dos renders.
    generation.current += 1;
    setRevision((value) => value + 1);
    setQueryState(value);
  }

  function retry() {
    forceFresh.current = true;
    generation.current += 1;
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    const version = ++generation.current;
    let cancelled = false;
    if (query.trim().length < 2) return;

    const timer = window.setTimeout(async () => {
      try {
        const fresh = forceFresh.current;
        forceFresh.current = false;
        const results = await searchCatalog(query.trim(), { fresh });
        if (!cancelled && generation.current === version) {
          setResponse({ query, revision, status: "success", results, error: null });
        }
      } catch (error) {
        if (!cancelled && generation.current === version) {
          setResponse({ query, revision, status: "error", results: [], error: errorMessage(error) });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, revision]);

  return {
    query,
    setQuery,
    retry,
    eligible,
    status: !eligible ? "idle" : current ? response.status : "loading",
    results: eligible && current ? response.results : [],
    error: eligible && current ? response.error : null,
  };
}
