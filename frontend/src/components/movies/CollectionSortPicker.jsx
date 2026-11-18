import { useEffect, useRef } from "react";
import Icon from "../ui/Icon";

const OPTIONS = [
  { value: "recientes", label: "Recientes", icon: "clock" },
  { value: "titulo", label: "Título A–Z", icon: "list" },
  { value: "anio", label: "Año reciente", icon: "film" },
  { value: "puntuacion", label: "Mejor nota", icon: "star" },
];

export default function CollectionSortPicker({ value, onChange, disabled, onOpen }) {
  const ref = useRef(null);
  const selected = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  useEffect(() => {
    function closeOutside(event) {
      const panel = ref.current;
      if (panel && !panel.contains(event.target)) panel.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => { if (disabled) ref.current.open = false; }, [disabled]);

  function close() {
    ref.current.open = false;
    ref.current.querySelector("summary").focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && ref.current.open) {
      event.preventDefault();
      close();
      return;
    }
    if (disabled || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const panel = ref.current;
    const buttons = [...panel.querySelectorAll("button")];
    const current = buttons.indexOf(document.activeElement);
    panel.open = true;
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : current === -1 ? OPTIONS.indexOf(selected)
        : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus({ preventScroll: true });
  }

  return (
    <details className="collection-sort" ref={ref}
      onToggle={(event) => { if (event.currentTarget.open) onOpen?.(); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
      onKeyDown={handleKeyDown}>
      <summary className="collection-sort__trigger" aria-label={`Ordenar por: ${selected.label}`} aria-disabled={disabled || undefined}
        onClick={(event) => { if (disabled) event.preventDefault(); }}>
        <Icon name={selected.icon} size={13} /><span>{selected.label}</span><Icon name="chevron-down" size={12} />
      </summary>
      <div className="collection-sort__panel" role="group" aria-label="Ordenar mi colección">
        <p>Ordenar películas</p>
        {OPTIONS.map((option) => (
          <button key={option.value} type="button" disabled={disabled} aria-pressed={value === option.value}
            onClick={() => { onChange(option.value); close(); }}>
            <Icon name={option.icon} size={16} /><span>{option.label}</span>
            {value === option.value && <Icon name="check" size={15} />}
          </button>
        ))}
      </div>
    </details>
  );
}
