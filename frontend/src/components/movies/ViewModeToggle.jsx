import Icon from "../ui/Icon";
import "./ViewModeToggle.css";

export default function ViewModeToggle({ value, onChange }) {
  return (
    <div className="view-mode-toggle" role="group" aria-label="Vista de la colección">
      <button type="button" className={value === "grid" ? "is-active" : ""} aria-pressed={value === "grid"} aria-label="Vista de cuadrícula" title="Cuadrícula" onClick={() => onChange("grid")}><Icon name="grid" size={17} /><span>Cuadrícula</span></button>
      <button type="button" className={value === "list" ? "is-active" : ""} aria-pressed={value === "list"} aria-label="Vista de lista" title="Lista" onClick={() => onChange("list")}><Icon name="list" size={17} /><span>Lista</span></button>
    </div>
  );
}
