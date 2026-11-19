import Icon from "../ui/Icon";
import Poster from "../ui/Poster";

export default function MovieDetailLayout({ titulo, poster, anio, duracion, generos = [], puntuacion, cargandoNota = false, titleId, children }) {
  useEffect(() => { document.title = `${titulo} · Muvis`; }, [titulo]);
  const tieneNota = Number.isFinite(puntuacion);
  const nota = tieneNota ? puntuacion.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";

  return (
    <section className="movie-detail__layout" aria-labelledby={titleId}>
      <aside className="movie-detail__poster-column" aria-label="Póster de la película">
        <div className="movie-detail__poster"><Poster src={poster} title={titulo} sizes="(max-width: 639px) 112px, 220px" loading="eager" /></div>
      </aside>
      <header className="movie-detail__heading">
        <h1 id={titleId}>{titulo}</h1>
        <div className="movie-detail__meta">
          <span className="movie-detail__year">{anio || "Año no disponible"}</span>
          {duracion > 0 && <span className="movie-detail__duration"><Icon name="clock" size={14} />{duracion} min</span>}
        </div>
        {generos.length > 0 && <div className="movie-detail__genres">{generos.map((genero) => <span key={genero}>{genero}</span>)}</div>}
        <div className="movie-detail__rating" aria-busy={cargandoNota}>
          <Icon name="star" size={18} />
          <span className="movie-detail__score">{nota}</span>
          <div><p>Puntuación TMDB</p><span>{cargandoNota ? "Consultando…" : tieneNota ? "Sobre 10" : "Sin valoración"}</span></div>
        </div>
      </header>
      <div className="movie-detail__content">{children}</div>
    </section>
  );
}
import { useEffect } from "react";
