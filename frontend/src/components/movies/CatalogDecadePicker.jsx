import { useEffect, useRef, useState } from "react";
import Dialog from "../ui/Dialog";
import Icon from "../ui/Icon";
import { catalogDecades } from "../../utils/catalogNavigation";
import "./CatalogDecadePicker.css";

function panelPosition(button) {
  const { right, top, bottom } = button.getBoundingClientRect();
  const below = window.innerHeight - bottom;
  const opensBelow = below >= 320 || below >= top;
  return {
    "--decade-panel-right": `${document.documentElement.clientWidth - right}px`,
    "--decade-panel-top": opensBelow ? `${bottom + 8}px` : "auto",
    "--decade-panel-bottom": opensBelow ? "auto" : `${window.innerHeight - top + 8}px`,
    "--decade-panel-space": `${(opensBelow ? below : top) - 20}px`,
  };
}

function decadeLabel(decade) {
  return decade >= 1910 && decade < 2000 ? `${decade % 100}s` : `${decade}s`;
}

export default function CatalogDecadePicker({ value, onChange }) {
  const triggerRef = useRef(null);
  const [position, setPosition] = useState(null);
  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const button = triggerRef.current;
      if (button) setPosition(panelPosition(button));
    }
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  function selectDecade(decade) {
    setPosition(null);
    if (decade !== value) onChange(decade);
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={`button decade-picker__trigger${value !== null ? " is-filtered" : ""}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => setPosition(panelPosition(event.currentTarget))}
      >
        <Icon name="sliders" size={17} />
        {value === null ? "Todas las décadas" : `Década · ${decadeLabel(value)}`}
        <Icon name="chevron-down" size={15} />
      </button>

      {open && (
        <Dialog className="decade-picker__panel dialog--enter" style={position} title="Elegí una década" onClose={() => setPosition(null)}>
          <div className="decade-picker__options">
            {[null, ...catalogDecades].map((decade) => (
              <button
                key={decade ?? "all"}
                className={`decade-picker__option${decade === null ? " decade-picker__option--all" : ""}`}
                type="button"
                aria-label={decade === null ? undefined : `${decade} a ${decade + 9}`}
                aria-pressed={decade === value}
                data-autofocus={decade === value ? "" : undefined}
                onClick={() => selectDecade(decade)}
              >
                {decade === null ? "Todas las décadas" : decadeLabel(decade)}
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}
