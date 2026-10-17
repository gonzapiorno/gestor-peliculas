import Icon from "./Icon";
import "./PageState.css";
export default function PageState({ kind = "empty", title, description, children }) {
  return <section className={`page-state page-state--${kind}`} role={kind === "error" ? "alert" : "status"}>
    <span className="page-state__icon"><Icon name={kind === "error" ? "alert" : kind === "search" ? "search" : "library"} size={28}/></span>
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {children && <div className="page-state__actions">{children}</div>}
  </section>;
}
export function MovieSkeleton({ count = 4 }) {
  return <div role="status" aria-label="Cargando películas" className={`skeleton-grid skeleton-grid--${count}`}>
    <span className="visually-hidden">Cargando películas…</span>
    {Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index} aria-hidden="true"><div className="skeleton-card__poster"/><div className="skeleton-card__line"/><div className="skeleton-card__line skeleton-card__line--short"/></div>)}
  </div>;
}
