import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import GlobalSearch from "../movies/GlobalSearch";
import Icon from "../ui/Icon";
import { errorMessage } from "../../utils/errorMessage";
import "./Header.css";

function SessionActions({ auth, variant, compact }) {
  const activoRef = useRef(false);
  const operacionRef = useRef(null);
  const [pendiente, setPendiente] = useState(null);
  const [error, setError] = useState("");
  const { user, status } = auth;
  const location = useLocation();
  const esPagina = variant === "page";
  const retorno = { from: { pathname: location.pathname, search: location.search, hash: location.hash } };

  useEffect(() => {
    activoRef.current = true;
    return () => { activoRef.current = false; };
  }, []);

  async function ejecutar(tipo) {
    if (operacionRef.current || status === "loading") return;
    const operacion = {};
    operacionRef.current = operacion;
    setPendiente(tipo);
    setError("");
    try {
      if (tipo === "logout") await auth.logout();
      else await auth.retrySession();
    } catch (cause) {
      if (activoRef.current) setError(errorMessage(cause));
    } finally {
      if (operacionRef.current === operacion) {
        operacionRef.current = null;
        if (activoRef.current) setPendiente(null);
      }
    }
  }

  const ocupado = pendiente !== null || status === "loading";
  return (
    <div className={esPagina ? "account-session" : "header__account"} aria-busy={pendiente !== null}>
      {user ? (
        <div className={esPagina ? "account-session__actions" : "header__session"}>
          {esPagina ? (
            !compact && <p className="account-session__description">Tu colección está vinculada a esta cuenta.</p>
          ) : (
            <Link to="/cuenta" className="header__profile" aria-label={"Mi cuenta: " + (user.nombre_usuario || user.email)}>
              <span className="header__avatar"><Icon name="user" size={19} /></span>
              <span className="header__identity">
                <span className="header__username" title={user.nombre_usuario || user.email}>{user.nombre_usuario || user.email}</span>
                <span className="header__account-label">Mi cuenta</span>
              </span>
            </Link>
          )}
          <button className={esPagina ? "button" : "header__logout"} type="button" disabled={ocupado} onClick={() => ejecutar("logout")}>{pendiente === "logout" ? "Cerrando sesión…" : "Cerrar sesión"}</button>
        </div>
      ) : status === "loading" ? (
        <span className="header__session-status" role="status">Comprobando sesión…</span>
      ) : (
        <>
          {esPagina && !compact && <p className="account-session__description">Guardá tus favoritas, puntuá lo que viste y llevá tu colección a donde vayas.</p>}
          <div className="header__auth-links">
            <NavLink className={esPagina ? "button button--primary" : "header__auth-link"} to="/login" state={retorno}>Iniciar sesión</NavLink>
            <NavLink className={esPagina ? "button" : "header__auth-link header__auth-link--register"} to="/registro" state={retorno}>Crear cuenta</NavLink>
          </div>
        </>
      )}

      {(error || status === "error") && (
        <div className={esPagina ? "inline-error account-session__error" : "header__session-error"} role="alert">
          <p>{error || "No pudimos comprobar tu sesión."}</p>
          <button type="button" disabled={ocupado} onClick={() => ejecutar(error && user ? "logout" : "session")}><Icon name="refresh" size={14} />{error && user ? "Reintentar cierre" : "Reintentar sesión"}</button>
        </div>
      )}
    </div>
  );
}

export function AccountSession({ variant = "header", compact = false }) {
  const auth = useAuth();
  return <SessionActions key={String(auth.user?.id ?? "anonymous") + variant} auth={auth} variant={variant} compact={compact} />;
}

export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <NavLink to="/" className="header__mobile-brand" aria-label="Muvis Beta · Ir a descubrir">
          <img src="/logos/muvis-logo.svg" alt="Muvis" width="112" height="33" /><span className="beta-badge">BETA</span>
        </NavLink>
        <div className="header__search"><GlobalSearch /></div>
        <div className="header__desktop-account"><AccountSession /></div>
        <Link className="header__mobile-account" to="/cuenta" aria-label="Ir a mi cuenta"><Icon name="user" size={21} /></Link>
      </div>
    </header>
  );
}