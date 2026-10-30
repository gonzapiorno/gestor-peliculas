import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordField from "../components/auth/PasswordField";
import GoogleAccess from "../components/auth/GoogleAccess";
import FieldFeedback from "../components/auth/FieldFeedback";
import { focusAuthField } from "../utils/authFocus";
import Icon from "../components/ui/Icon";
import { safeAuthDestination, validateAuthFields, verificationCooldown } from "../utils/authFlow";
import { errorMessage } from "../utils/errorMessage";
import "./AuthPage.css";

function AuthForm({ mode }) {
  const register = mode === "register";
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mounted = useRef(false);
  const pending = useRef(false);
  const [fields, setFields] = useState({ nombre_usuario: "", email: typeof location.state?.email === "string" ? location.state.email : "", password: "", confirmacion: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const destination = safeAuthDestination(location.state?.from);
  const disabled = busy || auth.status === "loading";
  const navigationState = { from: destination, email: fields.email.trim() };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function change(event) {
    const { name, value } = event.target;
    setFields((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setError(""); setNeedsVerification(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current || auth.status === "loading") return;
    const validation = validateAuthFields(fields, register);
    if (event.currentTarget.elements.namedItem("email").validity.typeMismatch) validation.email = "Ingresá un correo electrónico válido.";
    setErrors(validation); setError(""); setNeedsVerification(false);
    if (Object.keys(validation).length) {
      if (!register) setError(validation[Object.keys(validation)[0]]);
      focusAuthField(event.currentTarget.elements.namedItem(Object.keys(validation)[0]), true);
      return;
    }
    pending.current = true; setBusy(true);
    const email = fields.email.trim();
    try {
      if (register) {
        await auth.register(fields.nombre_usuario.trim(), email, fields.password);
        verificationCooldown.start(email);
        if (mounted.current) {
          navigate("/verificar-email", { replace: true, state: { email, from: destination, registered: true } });
        }
      } else {
        await auth.login(email, fields.password);
        if (mounted.current) navigate(destination, { replace: true });
      }
    } catch (cause) {
      if (mounted.current) {
        setError(errorMessage(cause));
        setNeedsVerification(cause.code === "EMAIL_NO_VERIFICADO");
      }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function retrySession() {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try { await auth.retrySession(); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }

  if (auth.status === "authenticated" && auth.user) return <Navigate replace to={auth.user.email_verificado !== true ? "/verificar-email" : destination} state={{ email: auth.user.email, from: destination }} />;
  const prefix = register ? "register" : "login";
  const statusMessage = auth.status === "loading" ? "Comprobando tu sesión…" : !register && location.state?.verified ? "Correo verificado. Ya podés iniciar sesión." : !register && (auth.expired || location.state?.expired) ? "Tu sesión terminó. Iniciá sesión para continuar." : "";
  return <AuthLayout mode={mode} navigationState={navigationState}
    title={register ? "Creá tu cinemateca." : "Bienvenido a Muvis."}
    description={register ? "Un lugar para las películas que viste y las que todavía te esperan." : "Volvé a tu colección. Tu próxima gran historia empieza acá."}>
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
      {register && <div className="auth-form__field">
        <label htmlFor="register-username">Nombre de usuario</label>
        <input id="register-username" name="nombre_usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={30} required value={fields.nombre_usuario} onChange={change} disabled={disabled} aria-invalid={Boolean(errors.nombre_usuario)} aria-describedby="username-feedback" />
        <FieldFeedback id="username-feedback" error={errors.nombre_usuario ? "Usá 3–30 letras, números o guiones bajos." : null} hint="3–30 letras, números o guiones bajos." />
      </div>}
      <div className="auth-form__field">
        <label htmlFor={`${prefix}-email`}>Correo electrónico</label>
        <input id={`${prefix}-email`} name="email" type="email" autoComplete={register ? "email" : "username"} autoCapitalize="none" spellCheck={false} required value={fields.email} onChange={change} disabled={disabled} aria-invalid={Boolean(errors.email)} aria-describedby="email-feedback" />
        <FieldFeedback id="email-feedback" error={errors.email} />
      </div>
      <PasswordField id={`${prefix}-password`} name="password" label="Contraseña" value={fields.password} onChange={change} disabled={disabled} required error={errors.password?.includes("entre") ? "Usá entre 12 y 128 caracteres." : errors.password} hint={register ? "Entre 12 y 128 caracteres." : undefined} autoComplete={register ? "new-password" : "current-password"} />
      {!register && <div className="auth-form__recovery"><button className="auth-text-button" type="button" disabled aria-describedby="recovery-unavailable">¿Olvidaste tu contraseña?</button><span id="recovery-unavailable">Próximamente</span></div>}
      {register && <PasswordField id="register-confirm" name="confirmacion" label="Confirmar contraseña" value={fields.confirmacion} onChange={change} disabled={disabled} required error={errors.confirmacion} autoComplete="new-password" />}
      <div className="auth-form__actions">
        <div className="auth-page__feedback" aria-live="polite">
          {!error && auth.status !== "error" && statusMessage && <p className="auth-page__status" role="status">{statusMessage}</p>}
          {error && <div className="auth-page__error" role="alert"><p>{needsVerification ? "Correo sin verificar." : error}</p>{needsVerification && <Link className="auth-page__verification-link" to="/verificar-email" state={navigationState}>Verificar mi correo</Link>}</div>}
          {auth.status === "error" && !error && <div className="auth-page__error" role="alert"><p>Sesión sin comprobar.</p><button type="button" className="auth-text-button" disabled={disabled} onClick={retrySession}>Reintentar conexión</button></div>}
        </div>
        <button className="button button--primary auth-form__submit" type="submit" disabled={disabled}>{busy ? register ? "Creando cuenta…" : "Ingresando…" : register ? "Crear mi cuenta" : "Iniciar sesión"}{!busy && <Icon name="arrow-right" size={17} />}</button>
      </div>
    </form>
    <div className="auth-divider"><span>O continuá con</span></div>
    <GoogleAccess />
    <p className="auth-page__alternate">{register ? "¿Ya tenés una cuenta?" : "¿Primera vez por acá?"} <Link to={register ? "/login" : "/registro"} state={navigationState}>{register ? "Iniciá sesión" : "Creá tu cuenta"}</Link></p>
  </AuthLayout>;
}

export default function AuthPage({ mode = "login" }) {
  return <AuthForm key={mode} mode={mode} />;
}
