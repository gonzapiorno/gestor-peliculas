import { useId } from "react";
import Icon from "../ui/Icon";

const notaInicial = 7;

export default function RatingSlider({ nota, onChange, disabled, focusOnOpen }) {
  const id = useId();
  const notaFormateada = nota?.toLocaleString("es-AR", { maximumFractionDigits: 1 });

  return (
    <>
      <label className="visually-hidden" htmlFor={id}>Puntuación personal, de 1 a 10</label>
      <div className="rating-dialog__preview" aria-hidden="true">
        <Icon name="star" size={25} />
        <span>{notaFormateada ?? "—"}</span>
        <small>/ 10</small>
      </div>
      <input
        className="rating-dialog__range"
        id={id}
        type="range"
        data-autofocus={focusOnOpen ? "" : undefined}
        min="1"
        max="10"
        step="0.5"
        value={nota ?? notaInicial}
        disabled={disabled}
        aria-valuetext={notaFormateada ? `${notaFormateada} sobre 10` : "Sin puntuar. Mové el control para elegir una nota."}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        onClick={nota == null ? (event) => onChange(Number(event.currentTarget.value)) : undefined}
        onKeyDown={nota == null ? (event) => {
          if (event.key !== " ") return;
          event.preventDefault();
          onChange(Number(event.currentTarget.value));
        } : undefined}
      />
      <div className="rating-dialog__bounds" aria-hidden="true"><span>1</span><span>10</span></div>
    </>
  );
}
