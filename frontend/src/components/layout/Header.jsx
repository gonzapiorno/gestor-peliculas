import { useEffect, useRef, useState } from "react";
import { NavLink, useMatch } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import Icon from "../ui/Icon";
import { errorMessage } from "../../utils/errorMessage";
import "./Header.css";

function HeaderAccount({ auth }) {
  const activoRef = useRef(false);
  const operacionRef = useRef(null);
  const [pendiente, setPendiente] = useState(null);
  const [error, setError] = useState("");
  const { user, status } = auth;

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
    <div className="header__account">
      {user ? (
        <div className="header__session">
          <div className="header__identity">
            <span className="header__username" title={user.nombre_usuario || user.email}>{user.nombre_usuario || user.email}</span>
            {user.nombre_usuario && user.email && <span className="header__email" title={user.email}>{user.email}</span>}
          </div>
          <button className="header__logout" type="button" disabled={ocupado} onClick={() => ejecutar("logout")}>{pendiente === "logout" ? "Saliendo…" : "Cerrar sesión"}</button>
        </div>
      ) : status === "loading" ? (
        <span className="header__session-status" role="status">Comprobando sesión…</span>
      ) : (
        <div className="header__auth-links">
          <NavLink className="header__auth-link" to="/login">Ingresar</NavLink>
          <NavLink className="header__auth-link header__auth-link--register" to="/registro">Crear cuenta</NavLink>
        </div>
      )}

      {(error || status === "error") && (
        <div className="header__session-error" role="alert">
          <p>{error || "No pudimos comprobar tu sesión."}</p>
          <button type="button" disabled={ocupado} onClick={() => ejecutar(error && user ? "logout" : "session")}><Icon name="refresh" size={13} />{error && user ? "Reintentar cierre" : "Reintentar sesión"}</button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const enDetalle = Boolean(useMatch("/pelicula/:id"));
  const auth = useAuth();
  return (
    <header className="header">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <div className="header__inner">
        <NavLink to="/" className="header__brand" aria-label="Muvis · Ir a descubrir">
          <img src="/logos/muvis-logo.svg" alt="Muvis" width="112" height="33" />
        </NavLink>
        <nav className="header__nav" aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => `header__link${isActive || enDetalle ? " active" : ""}`}>Descubrir</NavLink>
          <NavLink to="/coleccion" className="header__link">Mi colección</NavLink>
        </nav>
        <HeaderAccount key={auth.user?.id ?? "anonymous"} auth={auth} />
      </div>
    </header>
  );
}

export default Header;
