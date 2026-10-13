import CatalogMovieCard from "./CatalogMovieCard";
import "./CatalogMovieGrid.css";

function CatalogMovieGrid({ peliculas }) {
  return (
    <section className="catalog-grid">
      {peliculas.map((pelicula) => (
        <CatalogMovieCard
          key={pelicula.id_tmdb}
          pelicula={pelicula}
        />
      ))}
    </section>
  );
}

export default CatalogMovieGrid;