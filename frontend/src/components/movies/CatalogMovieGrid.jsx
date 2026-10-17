import CatalogMovieCard from "./CatalogMovieCard";
import "./CatalogMovieGrid.css";

function CatalogMovieGrid({ peliculas }) {
  return (
    <div className="catalog-grid">
      {peliculas.map((pelicula) => (
        <CatalogMovieCard key={pelicula.id_tmdb} pelicula={pelicula} />
      ))}
    </div>
  );
}

export default CatalogMovieGrid;