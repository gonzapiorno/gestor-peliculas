import { useId, useState } from "react";
import { enviarFeedback } from "../../services/feedbackApi";
import Dialog from "./Dialog";
import "./FeedbackPanel.css";

export default function FeedbackPanel({ onClose }) {
  const id = useId();
  const [tipo, setTipo] = useState("error");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(event) {
    event.preventDefault();
    const mensaje = descripcion.trim();
    if (enviando || !mensaje) return;

    setEnviando(true);
    setError("");

    try {
      await enviarFeedback({ tipo, descripcion: mensaje });
      setEnviado(true);
    } catch (cause) {
      setError(cause.status === 429
        ? "Alcanzaste el límite de envíos. Probá más tarde."
        : cause.message || "No se pudo enviar el feedback.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Dialog
        key="enviado"
        className="feedback-confirmation"
        title="Recibimos tu feedback. Gracias por ayudarnos a mejorar."
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog
      key="formulario"
      title="Dar feedback Beta"
      description="Contanos qué podríamos mejorar en Muvis."
      onClose={onClose}
      busy={enviando}
    >
      <form className="feedback-panel" onSubmit={enviar}>
        <label htmlFor={`${id}-type`}>Tipo de feedback</label>
        <select
          id={`${id}-type`}
          value={tipo}
          onChange={(event) => setTipo(event.target.value)}
          disabled={enviando}
          data-autofocus
        >
          <option value="error">Encontré un error</option>
          <option value="sugerencia">Tengo una sugerencia</option>
        </select>

        <label htmlFor={`${id}-description`}>Descripción</label>
        <textarea
          id={`${id}-description`}
          rows={5}
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="¿Qué pasó o qué te gustaría mejorar?"
          maxLength={1000}
          required
          disabled={enviando}
        />

        {error && <p className="inline-error" role="alert">{error}</p>}

        <div className="dialog__actions">
          <button className="button" type="button" onClick={onClose} disabled={enviando}>
            Cerrar
          </button>
          <button className="button button--primary" type="submit" disabled={enviando || !descripcion.trim()}>
            {enviando ? "Enviando…" : "Enviar feedback"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
