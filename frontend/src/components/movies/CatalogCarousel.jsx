import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CatalogMovieGrid from "./CatalogMovieGrid";
import Icon from "../ui/Icon";
import { catalogCategoryUrl, rememberResultPosition, isPlainLinkClick } from "../../utils/catalogNavigation";

export default function CatalogCarousel({ categoria, titulo, catalogo, tarjetas, entry }) {
  const [limites, setLimites] = useState({ inicio: true, final: true });
  const carouselRef = useRef(null);
  const sincronizarRef = useRef(null);
  const peliculas = catalogo.peliculas;
  const cantidadPeliculas = peliculas.length;
  const carouselId = `carousel-${categoria}`;

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    function sincronizar() {
      const inicio = carousel.scrollLeft < 2;
      const final = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2;
      setLimites((actual) => actual.inicio === inicio && actual.final === final
        ? actual : { inicio, final });
    }

    sincronizarRef.current = sincronizar;
    sincronizar();
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sincronizar) : null;
    resize?.observe(carousel);
    return () => {
      resize?.disconnect();
      sincronizarRef.current = null;
    };
  }, [cantidadPeliculas]);

  function desplazar(direccion) {
    const carousel = carouselRef.current;
    carousel?.scrollBy({ left: carousel.clientWidth * .85 * direccion });
  }

  return (
    <section className="discover-page__carousel" aria-labelledby={`${carouselId}-heading`} aria-busy={catalogo.cargando}>
      <div className="discover-page__section-heading">
        <h2 id={`${carouselId}-heading`}>{titulo}</h2>
        <Link className="button button--primary" to={catalogCategoryUrl(categoria)} state={{ desdeDescubrir: true }} aria-label={`Ver todo: ${titulo}`} onClick={(event) => {
          if (isPlainLinkClick(event)) rememberResultPosition(entry);
        }}>Ver todo<Icon name="arrow-right" size={16} /></Link>
      </div>
      {catalogo.cargando ? <p role="status">Cargando películas…</p>
        : catalogo.error ? (
          <div className="inline-error">
            <p role="alert">No pudimos cargar las películas de esta sección.</p>
            <button className="button" type="button" onClick={catalogo.cargarMas}>Reintentar</button>
          </div>
        ) : cantidadPeliculas > 0 ? (
          <div className="discover-page__carousel-track">
            <CatalogMovieGrid
              {...tarjetas}
              peliculas={peliculas}
              gridRef={carouselRef}
              carouselId={carouselId}
              onScroll={() => sincronizarRef.current?.()}
            />
            <button className="icon-button discover-page__carousel-arrow" type="button" data-direction="previous" aria-disabled={limites.inicio} aria-label={`Películas anteriores en ${titulo}`} aria-controls={carouselId} onClick={() => !limites.inicio && desplazar(-1)}><Icon name="arrow-left" /></button>
            <button className="icon-button discover-page__carousel-arrow" type="button" data-direction="next" aria-disabled={limites.final} aria-label={`Más películas en ${titulo}`} aria-controls={carouselId} onClick={() => !limites.final && desplazar(1)}><Icon name="arrow-right" /></button>
          </div>
        ) : <p>Todavía no hay películas para mostrar.</p>}
    </section>
  );
}
