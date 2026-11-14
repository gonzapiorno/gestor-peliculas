import CatalogMovieCard from "./CatalogMovieCard";
import "./CatalogMovieGrid.css";

function CatalogMovieGrid({
  peliculas,
  guardadas = new Set(),
  guardandoIds = new Set(),
  errores = new Map(),
  estadoColeccion = "loading",
  onAgregar,
  gridRef,
  carouselId,
  onScroll,
}) {
  return (
    <div
      className={carouselId ? "catalog-grid catalog-grid--carousel" : "catalog-grid"}
      ref={gridRef}
      onScroll={onScroll}
      id={carouselId}
      data-catalog-carousel={carouselId ? "" : undefined}
    >
      {peliculas.map((pelicula) => {
        const id = Number(pelicula.id_tmdb);
        return (
          <CatalogMovieCard
            key={pelicula.id_tmdb}
            pelicula={pelicula}
            guardada={guardadas.has(id)}
            comprobando={estadoColeccion === "loading"}
            comprobacionFallida={estadoColeccion === "error"}
            guardando={guardandoIds.has(id)}
            error={errores.get(id) ?? null}
            onAgregar={onAgregar}
          />
        );
      })}
    </div>
  );
}

export default CatalogMovieGrid;
