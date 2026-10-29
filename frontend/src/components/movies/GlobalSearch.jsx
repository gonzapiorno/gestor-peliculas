import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useMovieSearch from "../../hooks/useMovieSearch";
import MovieSearch from "./MovieSearch";
import "./GlobalSearch.css";

export default function GlobalSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const queryFromUrl = location.pathname === "/" ? new URLSearchParams(location.search).get("buscar") || "" : "";
  const search = useMovieSearch(queryFromUrl);
  useEffect(() => {
    function shortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        containerRef.current?.querySelector("input")?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <div className="global-search" ref={containerRef}>
    <MovieSearch {...search} onQueryChange={search.setQuery} onRetry={search.retry}
      onViewAll={() => navigate(`/?buscar=${encodeURIComponent(search.query.trim())}`)} />
  </div>;
}
