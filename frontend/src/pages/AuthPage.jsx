import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import Icon from "../components/ui/Icon";
import { errorMessage } from "../utils/errorMessage";
import "./AuthPage.css";

function destinoSeguro(from) {
  const ruta = typeof from === "string" ? from : from && typeof from.pathname === "string"
    ? `${from.pathname}${typeof from.search === "string" ? from.search : ""}${typeof from.hash === "string" ? from.hash : ""}`
    : "";
  if (!ruta.startsWith("/") || ruta.startsWith("//") || ruta.includes("\\") || [...ruta].some((char) => char.charCodeAt(0) < 32)) return "/coleccion";

  try {
    const destino = new URL(ruta, window.location.origin);
    const pathname = decodeURIComponent(destino.pathname).replace(/\/+$/, "").toLowerCase();
    if (destino.origin !== window.location.origin || pathname.startsWith("//") || ["/login", "/registro"].includes(pathname)) return "/coleccion";
    return `${destino.pathname}${destino.search}${destino.hash}`;
  } catch {
    return "/coleccion";
  }
}

function AuthForm({ mode }) {
  const registro = mode === "register";
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activoRef = useRef(false);
  const operacionRef = useRef(null);
  const [campos, setCampos] = useState({
    nombre_usuario: "",
    email: typeof location.state?.email === "string" ? location.state.email : "",
    password: "",
  });
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState("");
  const [pendiente, setPendiente] = useState(null);
  const destino = destinoSeguro(location.state?.from);
  const ocupado = pendiente !== null || auth.status === "loading";

  useEffect(() => {
    activoRef.current = true;
    return () => { activoRef.current = false; };
  }, []);

  function cambiarCampo(event) {
    const { name, value } = event.target;
    setCampos((anteriores) => ({ ...anteriores, [name]: value }));
    setErrores((anteriores) => ({ ...anteriores, [name]: undefined }));
    setErrorEnvio("");
  }

  async function enviar(event) {
    event.preventDefault();
    if (operacionRef.current || auth.status === "loading") return;

    const validacion = {};
    const nombre = campos.nombre_usuario.trim();
    const email = campos.email.trim();
    if (registro && !/^[a-zA-Z0-9_]{3,30}$/.test(nombre)) validacion.nombre_usuario = "Usá entre 3 y 30 letras, números o guiones bajos, sin espacios ni acentos.";
    const emailInput = event.currentTarget.elements.namedItem("email");
    if (!email || emailInput.validity.typeMismatch) validacion.email = "Ingresá un email válido.";
    const longitudPassword = Array.from(campos.password).length;
    if (!campos.password) validacion.password = "Ingresá tu contraseña.";
    else if (registro && (longitudPassword < 12 || longitudPassword > 128)) validacion.password = "La contraseña debe tener entre 12 y 128 caracteres.";

    setErrores(validacion);
    setErrorEnvio("");
    if (Object.keys(validacion).length > 0) {
      event.currentTarget.elements.namedItem(Object.keys(validacion)[0])?.focus();
      return;
    }

    const operacion = {};
    operacionRef.current = operacion;
    setPendiente("submit");
    try {
      if (registro) {
        await auth.register(nombre, email, campos.password);
        if (activoRef.current) navigate("/login", { replace: true, state: { email, registered: true, from: destino } });
      } else {
        await auth.login(email, campos.password);
        if (activoRef.current) navigate(destino, { replace: true });
      }
    } catch (cause) {
      if (activoRef.current) setErrorEnvio(errorMessage(cause));
    } finally {
      if (operacionRef.current === operacion) {
        operacionRef.current = null;
        if (activoRef.current) setPendiente(null);
      }
    }
  }

  async function reintentarSesion() {
    if (operacionRef.current || auth.status === "loading") return;
    const operacion = {};
    operacionRef.current = operacion;
    setPendiente("session");
    setErrorEnvio("");
    try { await auth.retrySession(); }
    catch (cause) { if (activoRef.current) setErrorEnvio(errorMessage(cause)); }
    finally {
      if (operacionRef.current === operacion) {
        operacionRef.current = null;
        if (activoRef.current) setPendiente(null);
      }
    }
  }

  if (auth.status === "authenticated" && auth.user) return <Navigate to={destino} replace />;

  const prefix = registro ? "register" : "login";
  const estadoError = typeof auth.error === "string" ? auth.error : errorMessage(auth.error);

  return (
    <main className="auth-page page-container">
      <header className="page-heading auth-page__heading">
        <p className="eyebrow">Tu historia de cine</p>
        <h1 className="page-title">{registro ? "Crear cuenta" : "Iniciar sesión"}</h1>
        <p className="page-description">{registro ? "Un lugar para guardar las películas que se quedan contigo." : "Volvé a tus películas, tus favoritas y las historias que esperan su momento."}</p>
      </header>

      <div className="auth-page__card">
        {!registro && location.state?.registered === true && (
          <p className="auth-page__success" role="status"><Icon name="check" size={18} />Tu cuenta está creada. Iniciá sesión para empezar tu colección.</p>
        )}
        {!registro && location.state?.registered !== true && (auth.expired || location.state?.expired) && (
          <p className="auth-page__session-status" role="status">Tu sesión terminó. Iniciá sesión para continuar con tu colección.</p>
        )}
        {auth.status === "loading" && <p className="auth-page__session-status" role="status">Comprobando tu sesión…</p>}
        {auth.status === "error" && !errorEnvio && (
          <div className="inline-error auth-page__error" role="alert">
            <p>No pudimos comprobar tu sesión. {estadoError}.</p>
            <button className="button" type="button" disabled={ocupado} onClick={reintentarSesion}><Icon name="refresh" size={16} />Reintentar conexión</button>
          </div>
        )}

        <form className="auth-form" onSubmit={enviar} noValidate aria-busy={pendiente === "submit"}>
          {registro && (
            <div className="auth-form__field">
              <label htmlFor={`${prefix}-username`}>Nombre de usuario</label>
              <input id={`${prefix}-username`} name="nombre_usuario" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" required value={campos.nombre_usuario} onChange={cambiarCampo} disabled={ocupado} aria-invalid={Boolean(errores.nombre_usuario)} aria-describedby={`${prefix}-username-hint${errores.nombre_usuario ? ` ${prefix}-username-error` : ""}`} />
              <p className="auth-form__hint" id={`${prefix}-username-hint`}>De 3 a 30 letras, números o guiones bajos.</p>
              {errores.nombre_usuario && <p className="auth-form__field-error" id={`${prefix}-username-error`}>{errores.nombre_usuario}</p>}
            </div>
          )}
          <div className="auth-form__field">
            <label htmlFor={`${prefix}-email`}>Email</label>
            <input id={`${prefix}-email`} name="email" type="email" autoComplete={registro ? "email" : "username"} autoCapitalize="none" spellCheck={false} required value={campos.email} onChange={cambiarCampo} disabled={ocupado} aria-invalid={Boolean(errores.email)} aria-describedby={errores.email ? `${prefix}-email-error` : undefined} />
            {errores.email && <p className="auth-form__field-error" id={`${prefix}-email-error`}>{errores.email}</p>}
          </div>
          <div className="auth-form__field">
            <label htmlFor={`${prefix}-password`}>Contraseña</label>
            <input id={`${prefix}-password`} name="password" type="password" autoComplete={registro ? "new-password" : "current-password"} required value={campos.password} onChange={cambiarCampo} disabled={ocupado} aria-invalid={Boolean(errores.password)} aria-describedby={[registro ? `${prefix}-password-hint` : "", errores.password ? `${prefix}-password-error` : ""].filter(Boolean).join(" ") || undefined} />
            {registro && <p className="auth-form__hint" id={`${prefix}-password-hint`}>Entre 12 y 128 caracteres. Podés usar una frase que recuerdes.</p>}
            {errores.password && <p className="auth-form__field-error" id={`${prefix}-password-error`}>{errores.password}</p>}
          </div>

          {errorEnvio && <p className="inline-error auth-page__error" role="alert"><Icon name="alert" size={17} />{errorEnvio}</p>}
          <button className="button button--primary auth-form__submit" type="submit" disabled={ocupado}>
            {pendiente === "submit" ? registro ? "Creando cuenta…" : "Ingresando…" : registro ? "Crear mi cuenta" : "Iniciar sesión"}
            {pendiente !== "submit" && <Icon name="arrow-right" size={17} />}
          </button>
        </form>

        <p className="auth-page__alternate">
          {registro ? "¿Ya tenés una cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
          <Link to={registro ? "/login" : "/registro"} state={{ from: destino, email: campos.email.trim() }}>{registro ? "Iniciá sesión" : "Creá tu cuenta"}</Link>
        </p>
      </div>
      <Link className="auth-page__back" to="/"><Icon name="arrow-left" size={15} />Volver a descubrir</Link>
    </main>
  );
}

export default function AuthPage({ mode = "login" }) {
  const formMode = mode === "register" ? "register" : "login";
  return <AuthForm key={formMode} mode={formMode} />;
}
