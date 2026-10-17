import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";
import "./Dialog.css";
export default function Dialog({ title, description, children, onClose, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.getElementById("contenido")?.focus();
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key !== "Tab") return;
    const controls = [...ref.current.querySelectorAll(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])"
    )].filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} aria-busy={busy} onKeyDown={handleKeyDown} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="dialog__body">
        <button className="icon-button dialog__close" type="button" onClick={onClose} disabled={busy} aria-label="Cerrar ventana"><Icon name="close"/></button>
        <h2 id={titleId} className="dialog__title">{title}</h2>
        {description && <p id={descriptionId} className="dialog__description">{description}</p>}
        {children}
      </div>
    </dialog>
  );
}
