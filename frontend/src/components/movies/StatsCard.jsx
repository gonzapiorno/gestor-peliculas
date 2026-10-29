import Icon from "../ui/Icon";
import "./StatsCard.css";

export default function StatsCard({ label, value, icon, detail, tone = "primary", loading = false }) {
  return (
    <article className={`stats-card stats-card--${tone}`} aria-label={loading ? `${label}: cargando` : undefined}>
      <div className="stats-card__top"><span>{label}</span><span className="stats-card__icon"><Icon name={icon} size={18} /></span></div>
      <strong className="stats-card__value">{loading ? "—" : value}</strong>
      {detail && <span className="stats-card__detail">{loading ? "Cargando tu colección" : detail}</span>}
    </article>
  );
}
