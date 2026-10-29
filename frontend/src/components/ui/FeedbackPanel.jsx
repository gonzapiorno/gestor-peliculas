import { useId, useState } from "react";
import Dialog from "./Dialog";
import "./FeedbackPanel.css";

export default function FeedbackPanel({ onClose }) {
  const id = useId();
  const [tipo, setTipo] = useState("error");
  const [descripcion, setDescripcion] = useState("");

  return (
    <Dialog title="Dar feedback Beta" description="Contanos qué podríamos mejorar en Muvis." onClose={onClose}>
      <div className="feedback-panel__notice" id={`${id}-notice`}>
        <strong>El envío estará disponible próximamente.</strong>
        <p>Este formulario todavía no envía ni guarda mensajes. El texto se descarta al cerrar.</p>
      </div>
      <form className="feedback-panel" onSubmit={(event) => event.preventDefault()} aria-describedby={`${id}-notice`}>
        <label htmlFor={`${id}-type`}>Tipo de feedback</label>
        <select id={`${id}-type`} value={tipo} onChange={(event) => setTipo(event.target.value)} data-autofocus>
          <option value="error">Encontré un error</option>
          <option value="sugerencia">Tengo una sugerencia</option>
        </select>
        <label htmlFor={`${id}-description`}>Descripción</label>
        <textarea id={`${id}-description`} rows={5} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} placeholder="¿Qué pasó o qué te gustaría mejorar?" />
        <div className="dialog__actions">
          <button className="button" type="button" onClick={onClose}>Cerrar</button>
          <button className="button button--primary" type="submit" disabled>Envío próximamente</button>
        </div>
      </form>
    </Dialog>
  );
}
