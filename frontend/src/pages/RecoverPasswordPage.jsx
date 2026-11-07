import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import FieldFeedback from "../components/auth/FieldFeedback";
import { solicitarRecuperacionPassword } from "../services/authApi";
import { safeAuthDestination } from "../utils/authFlow";
import { focusAuthField } from "../utils/authFocus";
import { errorMessage } from "../utils/errorMessage";
import "./AuthPage.css";

export default function RecoverPasswordPage() {
  const { state } = useLocation();
  const [email, setEmail] = useState(typeof state?.email === "string" ? state.email : "");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const pending = useRef(false);
  const navigationState = { email: email.trim(), from: safeAuthDestination(state?.from) };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (pending.current || submitted) return;

    const input = event.currentTarget.elements.namedItem("email");
    if (!navigationState.email || input.validity.typeMismatch) {
      setFieldError("Ingresá un correo electrónico válido.");
      focusAuthField(input, true);
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await solicitarRecuperacionPassword(navigationState.email);
      if (mounted.current) setSubmitted(true);
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <AuthLayout mode="recover" title="Recuperá tu contraseña."
      description="Ingresá el correo que usaste para crear tu cuenta.">
      {submitted ? <>
        <p className="auth-page__success" role="status">
          Si la cuenta puede recuperarse, te enviaremos un enlace. Revisá tu correo y la carpeta de spam.
        </p>
        <button className="auth-text-button" type="button" onClick={() => setSubmitted(false)}>Usar otro correo</button>
      </> : <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
        <div className="auth-form__field">
          <label htmlFor="recovery-email">Correo electrónico</label>
          <input id="recovery-email" name="email" type="email" autoComplete="email" autoCapitalize="none"
            spellCheck={false} required value={email} disabled={busy} aria-invalid={Boolean(fieldError)}
            aria-describedby="recovery-email-feedback" onChange={(event) => {
              setEmail(event.target.value);
              setFieldError("");
              setError("");
            }} />
          <FieldFeedback id="recovery-email-feedback" error={fieldError} />
        </div>
        <div className="auth-form__actions">
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          <button className="button button--primary auth-form__submit" type="submit" disabled={busy}>
            {busy ? "Solicitando…" : "Solicitar enlace"}
          </button>
        </div>
      </form>}
      <p className="auth-page__alternate"><Link to="/login" state={navigationState}>Volver al inicio de sesión</Link></p>
    </AuthLayout>
  );
}
