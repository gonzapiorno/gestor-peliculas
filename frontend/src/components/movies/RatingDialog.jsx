import { useId, useState } from "react";

import Dialog from "../ui/Dialog";
import Icon from "../ui/Icon";
import "./RatingDialog.css";

function RatingDialog({ pelicula, onClose, onSave, busy, error }) {
  const [nota, setNota] = useState(Number(pelicula.puntuacion_personal ?? 7));
  const id = useId();
  const notaFormateada = Number(nota).toLocaleString("es-AR", { maximumFractionDigits: 1 });

  return (
    <Dialog
      title="Tu puntuación"
      description={pelicula.titulo}
      onClose={onClose}
      busy={busy}
    >
      <form
        className="rating-dialog"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!busy && await onSave(pelicula, nota)) onClose();
        }}
      >
        <label className="visually-hidden" htmlFor={id}>Puntuación personal, de 1 a 10</label>
        <div className="rating-dialog__preview" aria-hidden="true">
          <Icon name="star" size={25} />
          <span>{notaFormateada}</span>
          <small>/ 10</small>
        </div>

        <input
          className="rating-dialog__range"
          id={id}
          type="range"
          data-autofocus
          min="1"
          max="10"
          step="0.5"
          value={nota}
          disabled={busy}
          aria-valuetext={`${notaFormateada} sobre 10`}
          onChange={(event) => setNota(Number(event.target.value))}
        />
        <div className="rating-dialog__bounds" aria-hidden="true"><span>1</span><span>10</span></div>
        <p className="rating-dialog__hint">Tu mirada cuenta. Ajustá la nota de a medio punto y guardala cuando esté lista.</p>

        {error && <p className="inline-error" role="alert">{error}</p>}

        <div className="rating-dialog__buttons">
          <button className="button" type="button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "Guardando…" : error ? "Reintentar guardar" : "Guardar puntuación"}
          </button>
        </div>

        {pelicula.puntuacion_personal != null && (
          <button
            className="rating-dialog__clear"
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!busy && await onSave(pelicula, null)) onClose();
            }}
          >
            Quitar puntuación y dejar sin puntuar
          </button>
        )}
      </form>
    </Dialog>
  );
}

export default RatingDialog;
