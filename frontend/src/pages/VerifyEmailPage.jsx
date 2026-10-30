import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuth } from "../auth/useAuth";
import { reenviarVerificacion, verificarEmail } from "../services/authApi";
import { normalizeVerificationCode, safeAuthDestination, verificationCooldown } from "../utils/authFlow";
import { errorMessage } from "../utils/errorMessage";
import { focusAuthField } from "../utils/authFocus";
import "./AuthPage.css";

export default function VerifyEmailPage() {
  const location = useLocation();
  const auth = useAuth();
  const initialEmail = typeof location.state?.email === "string" ? location.state.email : auth.user?.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [editing, setEditing] = useState(!initialEmail);
  const [code, setCode] = useState("");
  const [activeDigit, setActiveDigit] = useState(0);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState(null);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);
  const [remaining, setRemaining] = useState(() => verificationCooldown.remaining(initialEmail));
  const [verifyUntil, setVerifyUntil] = useState(0);
  const [verifyWait, setVerifyWait] = useState(0);
  const mounted = useRef(false);
  const operation = useRef(false);
  const codeInput = useRef(null);
  const emailInput = useRef(null);
  const destination = safeAuthDestination(location.state?.from);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    function update() {
      setRemaining(verificationCooldown.remaining(email));
      setVerifyWait(Math.max(0, Math.ceil((verifyUntil - Date.now()) / 1000)));
    }
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [email, verifyUntil]);
  useEffect(() => {
    if (editing) focusAuthField(emailInput.current);
    else focusAuthField(codeInput.current);
  }, [editing]);
  useEffect(() => { if (success) focusAuthField(document.getElementById("auth-title")); }, [success]);

  function validEmail() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+$/.test(email.trim()) || emailInput.current?.validity.typeMismatch) {
      setError("Ingresá un correo electrónico válido.");
      setInvalidField("email");
      setEditing(true);
      focusAuthField(emailInput.current, true);
      return false;
    }
    return true;
  }

  async function verify(event) {
    event.preventDefault();
    if (operation.current || verifyWait > 0 || success) return;
    setError(""); setNotice(""); setInvalidField(null);
    if (!validEmail()) return;
    if (code.length !== 6) { setError("Ingresá los seis dígitos del código."); setInvalidField("code"); focusAuthField(codeInput.current, true); return; }
    operation.current = true; setBusy("verify");
    try {
      await verificarEmail(email.trim(), code);
      if (!mounted.current) return;
      setSuccess(true); setCode("");
      // Una sesión previa sigue siendo real; sólo actualizamos su estado público.
      if (auth.user?.email?.toLowerCase() === email.trim().toLowerCase()) await auth.retrySession();
    } catch (cause) {
      if (mounted.current) {
        setError(errorMessage(cause));
        if (cause.status === 400) setInvalidField("code");
        if (cause.status === 429) setVerifyUntil(Date.now() + (cause.retryAfter ?? 60) * 1000);
        requestAnimationFrame(() => focusAuthField(codeInput.current, true));
      }
    } finally { operation.current = false; if (mounted.current) setBusy(null); }
  }

  async function resend() {
    if (operation.current || verificationCooldown.remaining(email) > 0 || success) return;
    setError(""); setNotice(""); setInvalidField(null);
    if (!validEmail()) return;
    operation.current = true; setBusy("resend");
    try {
      await reenviarVerificacion(email.trim());
      verificationCooldown.start(email);
      if (mounted.current) {
        setRemaining(verificationCooldown.remaining(email));
        setNotice("Solicitud recibida. Revisá tu correo y spam.");
      }
    } catch (cause) {
      if (cause.status === 429) verificationCooldown.start(email, cause.retryAfter ?? 60);
      if (mounted.current) {
        setError(errorMessage(cause));
        if (cause.status === 429) {
          setRemaining(verificationCooldown.remaining(email));
        }
      }
    } finally { operation.current = false; if (mounted.current) setBusy(null); }
  }

  const navigationState = { email: email.trim(), from: destination };
  return <AuthLayout mode="verify" verified={success} navigationState={navigationState} eyebrow="Un último paso"
    title={success ? "Tu correo está verificado." : "Verificá tu correo."}
    description={success ? "Ya podés entrar a Muvis y empezar tu colección." : "Ingresá el código de 6 dígitos que enviamos a tu correo."}>
    {success ? <div className="verification-page__success" role="status">
      <Link className="button button--primary auth-form__submit" to="/login" replace state={{ ...navigationState, verified: true }}>Ir a iniciar sesión</Link>
    </div> : <>
      {location.state?.registered && <p className="auth-page__success" role="status">Cuenta creada. Revisá tu correo.</p>}
      <form className="auth-form" onSubmit={verify} noValidate aria-busy={Boolean(busy)}>
        {editing ? <div className="auth-form__field">
          <label htmlFor="verification-email">Correo a verificar</label>
          <input ref={emailInput} id="verification-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} disabled={Boolean(busy)} required onChange={(event) => { setEmail(event.target.value); setCode(""); setError(""); setInvalidField(null); setNotice(""); }} aria-invalid={invalidField === "email"} aria-describedby="verification-email-hint verification-feedback" />
          <p id="verification-email-hint" className="auth-form__hint">Esto no cambia el correo de tu cuenta. <Link to="/registro" state={navigationState}>¿Te registraste con otro correo?</Link></p>
        </div> : <div className="verification-page__email"><span>{email}</span><button className="auth-text-button" type="button" disabled={Boolean(busy)} onClick={() => { setEditing(true); setError(""); setNotice(""); }}>Usar otro correo</button></div>}
        <div className="auth-form__field">
          <label htmlFor="verification-code">Código de verificación</label>
          <div className="verification-code">
            <input ref={codeInput} id="verification-code" name="codigo" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} disabled={Boolean(busy)} required aria-invalid={invalidField === "code"} aria-describedby="verification-feedback" className="verification-code__input"
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onSelect={(event) => setActiveDigit(Math.min(event.currentTarget.selectionStart ?? code.length, 5))}
              onChange={(event) => { setCode(normalizeVerificationCode(event.target.value)); setError(""); setInvalidField(null); }} />
            <div className="verification-code__slots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} className={`verification-code__slot${focused && activeDigit === index ? " is-active" : ""}`}>{code[index] || ""}</span>)}</div>
          </div>
        </div>
        <div className="auth-form__actions">
          <div id="verification-feedback" aria-live="polite">{error && <p className="inline-error auth-page__error" role="alert">{error}</p>}{notice && <p className="auth-page__success" role="status">{notice}</p>}</div>
          <button className="button button--primary auth-form__submit" type="submit" disabled={Boolean(busy) || verifyWait > 0}>{busy === "verify" ? "Verificando…" : verifyWait > 0 ? `Reintentá en ${verifyWait} s` : "Verificar cuenta"}</button>
        </div>
        <div className="verification-page__resend"><span>¿No recibiste el correo?</span><button className="button" type="button" disabled={Boolean(busy) || remaining > 0} onClick={resend}>{busy === "resend" ? "Solicitando…" : remaining > 0 ? `Reenviar en ${remaining} s` : "Reenviar código"}</button></div>
      </form>
    </>}
    <p className="auth-page__alternate"><Link to="/login" state={navigationState}>Volver al inicio de sesión</Link></p>
  </AuthLayout>;
}
