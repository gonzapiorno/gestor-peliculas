import { useState } from "react";
import FieldFeedback from "./FieldFeedback";
import "./PasswordField.css";

function VisibilityIcon({ visible }) {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {visible && <path d="m3 3 18 18" />}
  </svg>;
}

export default function PasswordField({ id, name = "password", label = "Contraseña", value, onChange, disabled, error, hint, autoComplete = "current-password", required = true, minLength, maxLength }) {
  const [visible, setVisible] = useState(false);
  return <div className="auth-form__field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-password">
      <input id={id} name={name} type={visible ? "text" : "password"} value={value} onChange={onChange} disabled={disabled} autoComplete={autoComplete} required={required} minLength={minLength} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={`${id}-feedback`} />
      <button type="button" className="auth-password__toggle" disabled={disabled} aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible((previous) => !previous)}><VisibilityIcon visible={visible} /></button>
    </div>
    <FieldFeedback id={`${id}-feedback`} error={error} hint={hint} />
  </div>;
}
