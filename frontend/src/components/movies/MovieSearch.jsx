import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import Poster from "../ui/Poster";
import "./MovieSearch.css";

export default function MovieSearch({ query, onQueryChange, results, status, error, onRetry, onViewAll }) {
  const navigate = useNavigate();
  const id = useId();
  const formRef = useRef(null);
  const anchorRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(-1);
  const eligible = query.trim().length >= 2;
  const open = eligible && expanded;
  const suggestions = results.slice(0, 5);
  const activeIndex = active < suggestions.length ? active : -1;
  const listId = `${id}-suggestions`;
  const hintId = `${id}-hint`;

  useEffect(() => {
    function closeOutside(event) {
      if (!formRef.current?.contains(event.target)) {
        setExpanded(false);
        setActive(-1);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function fitDropdown() {
      const anchor = anchorRef.current;
      const dropdown = dropdownRef.current;
      if (!anchor || !dropdown) return;
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const space = Math.max(120, bottom - anchor.getBoundingClientRect().bottom - 20);
      dropdown.style.maxHeight = `${Math.min(540, space)}px`;
    }
    fitDropdown();
    window.addEventListener("resize", fitDropdown);
    window.addEventListener("scroll", fitDropdown);
    window.visualViewport?.addEventListener("resize", fitDropdown);
    return () => {
      window.removeEventListener("resize", fitDropdown);
      window.removeEventListener("scroll", fitDropdown);
      window.visualViewport?.removeEventListener("resize", fitDropdown);
    };
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  function close() {
    setExpanded(false);
    setActive(-1);
  }

  function select(movie) {
    close();
    navigate(`/pelicula/${movie.id_tmdb}`);
  }

  function viewAll() {
    close();
    onViewAll();
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      if (eligible) event.preventDefault();
      close();
    } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && eligible) {
      event.preventDefault();
      setExpanded(true);
      if (suggestions.length === 0) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActive((previous) => !open || previous < 0
        ? (direction === 1 ? 0 : suggestions.length - 1)
        : (previous + direction + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && activeIndex >= 0) select(suggestions[activeIndex]);
      else if (status === "success" && results.length > 0) viewAll();
    }
  }

  return (
    <form ref={formRef} className="movie-search" role="search" aria-label="Buscar películas" onSubmit={(event) => event.preventDefault()} onKeyDown={(event) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        inputRef.current?.focus();
        close();
      }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <label className="visually-hidden" htmlFor={`${id}-input`}>Buscar películas por título</label>
      <div ref={anchorRef} className="movie-search__anchor">
        <div className="search-field movie-search__field">
          <Icon name="search" size={19} />
          <input
            ref={inputRef}
            id={`${id}-input`}
            className="field-input"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
            aria-describedby={hintId}
            autoComplete="off"
            placeholder="Buscá una película, encontrá tu próxima historia…"
            value={query}
            onChange={(event) => { onQueryChange(event.target.value); setExpanded(true); setActive(-1); }}
            onFocus={() => setExpanded(true)}
            onClick={() => setExpanded(true)}
            onKeyDown={handleKeyDown}
          />
          {query && <button className="icon-button" type="button" onClick={() => { onQueryChange(""); close(); inputRef.current?.focus(); }} aria-label="Limpiar búsqueda"><Icon name="close" size={17} /></button>}
          {open && <kbd className="movie-search__escape" aria-hidden="true">Esc</kbd>}
        </div>

        {open && (
          <div ref={dropdownRef} className="movie-search__dropdown">
            <p className="movie-search__heading">Resultados de búsqueda</p>
            {status === "loading" && <div className="movie-search__state" role="status"><Icon className="movie-search__spinner" name="refresh" size={18} /><p>Buscando películas…</p></div>}
            {status === "error" && <div className="movie-search__state" role="alert"><p>{error}.</p><button className="button" type="button" onClick={() => { setActive(-1); onRetry(); }}><Icon name="refresh" size={16} />Reintentar búsqueda</button></div>}
            {status === "success" && results.length === 0 && <div className="movie-search__state" role="status"><p>No encontramos películas para «{query.trim()}».</p></div>}
            <ul id={listId} className="movie-search__list" role="listbox" aria-label="Sugerencias de películas" aria-busy={status === "loading"}>
              {suggestions.map((movie, index) => (
                <li
                  key={movie.id_tmdb}
                  ref={(element) => { optionRefs.current[index] = element; }}
                  id={`${id}-option-${index}`}
                  className={`movie-search__option${activeIndex === index ? " is-active" : ""}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={(event) => { if (event.pointerType === "mouse") setActive(index); }}
                  onClick={() => select(movie)}
                >
                  <div className="movie-search__poster"><Poster src={movie.poster} title={movie.titulo} /></div>
                  <div className="movie-search__info">
                    <span className="movie-search__title">{movie.titulo}</span>
                    {Array.isArray(movie.generos) && movie.generos.length > 0 && <span className="movie-search__genres">{movie.generos.slice(0, 2).join(" · ")}</span>}
                    <span className="movie-search__year">{movie.anio || "Año no disponible"}</span>
                  </div>
                  <span className="movie-search__details" aria-hidden="true"><span className="movie-search__details-label">Ver detalles</span><Icon name="arrow-right" size={15} /></span>
                </li>
              ))}
            </ul>
            {status === "success" && results.length > 0 && <button className="movie-search__all button" type="button" onClick={viewAll}>Ver {results.length === 1 ? "el resultado" : `los ${results.length} resultados`}<Icon name="arrow-right" size={16} /></button>}
          </div>
        )}
      </div>
      <p id={hintId} className="movie-search__hint">{eligible ? "Buscamos por título en el catálogo de TMDB." : "Escribí al menos 2 caracteres para buscar en todo el catálogo."}</p>
    </form>
  );
}
