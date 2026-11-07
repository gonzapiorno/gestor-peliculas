import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordField from "../components/auth/PasswordField";
import { restablecerPassword } from "../services/authApi";
import { readPasswordResetToken, validateNewPassword } from "../utils/authFlow";
import { focusAuthField } from "../utils/authFocus";
import { errorMessage } from "../utils/errorMessage";
import "./AuthPage.css";

const emptyFields = { password: "", confirmacion: "" };

export default function ResetPasswordPage() {
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const [link, setLink] = useState(() => ({ hash, token: readPasswordResetToken(hash), version: 0 }));

  // Un enlace nuevo reinicia el formulario. Limpiar la URL conserva el actual.
  if (hash !== link.hash) {
    setLink(hash
      ? { hash, token: readPasswordResetToken(hash), version: link.version + 1 }
      : { ...link, hash: "" });
  }

  useEffect(() => {
    if (hash) navigate({ pathname, search, hash: "" }, { replace: true });
  }, [hash, pathname, search, navigate]);

  function clearToken() {
    setLink((current) => current.version === link.version ? { ...current, token: "" } : current);
  }

  return <ResetPasswordForm key={link.version} token={link.token} clearToken={clearToken} />;
}

function ResetPasswordForm({ token, clearToken }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [fields, setFields] = useState(emptyFields);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const mounted = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (completed && auth.status !== "authenticated") {
      navigate("/login", { replace: true, state: { passwordReset: true } });
    }
  }, [auth.status, completed, navigate]);

  function change(event) {
    const { name, value } = event.target;
    setFields((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined, confirmacion: undefined }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current || !token || completed) return;

    const validation = validateNewPassword(fields.password, fields.confirmacion);
    setErrors(validation);
    setError("");
    const [firstInvalidField] = Object.keys(validation);
    if (firstInvalidField) {
      focusAuthField(event.currentTarget.elements.namedItem(firstInvalidField), true);
      return;
    }

    pending.current = true;
    setBusy(true);
    try {
      await restablecerPassword(token, fields.password);
      if (!mounted.current) return;
      setFields(emptyFields);
      await auth.retrySession();
      if (!mounted.current) return;
      clearToken();
      setCompleted(true);
    } catch (cause) {
      if (!mounted.current) return;
      if (cause.status === 400) {
        clearToken();
        setFields(emptyFields);
      } else {
        setError(errorMessage(cause));
      }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  if (completed) return (
    <AuthLayout mode="reset" title="Contraseña actualizada."
      description="Ya podés usar la nueva contraseña para iniciar sesión.">
      <Link className="button button--primary auth-form__submit" to="/coleccion" replace>Ir a Mi colección</Link>
    </AuthLayout>
  );

  if (!token) return (
    <AuthLayout mode="reset" title="El enlace no está disponible."
      description="Abrí el enlace más reciente de tu correo o pedí uno nuevo.">
      <Link className="button button--primary auth-form__submit" to="/recuperar-password" replace>Solicitar otro enlace</Link>
      <p className="auth-page__alternate"><Link to="/login">Volver al inicio de sesión</Link></p>
    </AuthLayout>
  );

  return (
    <AuthLayout mode="reset" title="Elegí una contraseña nueva."
      description="Usá entre 12 y 128 caracteres para recuperar el acceso a tu cuenta.">
      <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
        <PasswordField id="reset-password" name="password" label="Nueva contraseña"
          value={fields.password} onChange={change} disabled={busy} error={errors.password} autoComplete="new-password" />
        <PasswordField id="reset-confirm" name="confirmacion" label="Confirmación de contraseña"
          value={fields.confirmacion} onChange={change} disabled={busy} error={errors.confirmacion} autoComplete="new-password" />
        <div className="auth-form__actions">
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          <button className="button button--primary auth-form__submit" type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar contraseña"}
          </button>
        </div>
      </form>
      <p className="auth-page__alternate"><Link to="/login">Volver al inicio de sesión</Link></p>
    </AuthLayout>
  );
}
