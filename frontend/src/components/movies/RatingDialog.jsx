import { useState } from "react";

import Dialog from "../ui/Dialog";
import RatingSlider from "./RatingSlider";
import "./RatingDialog.css";

function RatingDialog({ pelicula, onClose, onSave, busy, error }) {
  const [nota, setNota] = useState(Number(pelicula.puntuacion_personal ?? 7));

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
        <RatingSlider nota={nota} onChange={setNota} disabled={busy} focusOnOpen />
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
