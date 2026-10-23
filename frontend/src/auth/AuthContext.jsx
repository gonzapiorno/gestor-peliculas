import { useCallback, useEffect, useRef, useState } from "react";
import { cerrarSesion, iniciarSesion, obtenerUsuarioActual, registrarUsuario } from "../services/authApi";
import { ApiError, onSessionExpired, resetSessionSecurity } from "../services/apiClient";

import { AuthContext } from "./useAuth";
const initial = { user: null, status: "loading", error: null, expired: false, sessionKey: 0 };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(initial);
  const actionRef = useRef(0);
  const bootstrapRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const identityRef = useRef(null);
  const revalidatingRef = useRef(false);

  const recover = useCallback(async (refresh = false) => {
    const action = ++actionRef.current;
    if (refresh) {
      bootstrapRef.current = null;
    }
    if (!bootstrapRef.current) bootstrapRef.current = obtenerUsuarioActual();
    try {
      const user = await bootstrapRef.current;
      if (mountedRef.current && action === actionRef.current) {
        const key = identityRef.current !== user.id ? resetSessionSecurity() : null;
        identityRef.current = user.id;
        setSession((previous) => ({ ...previous, user, status: "authenticated", error: null, expired: false, sessionKey: key ?? previous.sessionKey }));
      }
    } catch (error) {
      if (!mountedRef.current || action !== actionRef.current) return;
      const wasAuthenticated = identityRef.current !== null;
      const key = wasAuthenticated ? resetSessionSecurity() : null;
      identityRef.current = null;
      setSession((previous) => ({ ...previous, user: null, status: error.status === 401 ? "anonymous" : "error", error: error.status === 401 ? null : error.message, expired: error.status === 401 && wasAuthenticated || previous.expired, sessionKey: key ?? previous.sessionKey }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = onSessionExpired(() => {
      ++actionRef.current;
      bootstrapRef.current = null;
      identityRef.current = null;
      setSession({ user: null, status: "anonymous", error: null, expired: true, sessionKey: resetSessionSecurity() });
    });
    recover();
    function revalidate() {
      if (busyRef.current || revalidatingRef.current || document.visibilityState !== "visible") return;
      revalidatingRef.current = true;
      recover(true).finally(() => { revalidatingRef.current = false; });
    }
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      mountedRef.current = false;
      unsubscribe();
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [recover]);

  async function login(email, password) {
    if (busyRef.current) throw new ApiError("Ya hay una operación de sesión en curso");
    busyRef.current = true;
    const action = ++actionRef.current;
    resetSessionSecurity();
    try {
      await iniciarSesion(email, password);
      const user = await obtenerUsuarioActual();
      if (!mountedRef.current || action !== actionRef.current) return;
      bootstrapRef.current = Promise.resolve(user);
      identityRef.current = user.id;
      setSession({ user, status: "authenticated", error: null, expired: false, sessionKey: resetSessionSecurity() });
    } catch (error) {
      bootstrapRef.current = null;
      identityRef.current = null;
      throw error;
    } finally { busyRef.current = false; }
  }

  async function register(nombreUsuario, email, password) {
    if (busyRef.current) throw new ApiError("Ya hay una operación de sesión en curso");
    busyRef.current = true;
    try { return await registrarUsuario(nombreUsuario, email, password); }
    finally { busyRef.current = false; }
  }

  async function logout() {
    if (busyRef.current) throw new ApiError("Ya hay una operación de sesión en curso");
    busyRef.current = true;
    try {
      await cerrarSesion();
      ++actionRef.current;
      bootstrapRef.current = null;
      identityRef.current = null;
      if (mountedRef.current) setSession({ user: null, status: "anonymous", error: null, expired: false, sessionKey: resetSessionSecurity() });
    } finally { busyRef.current = false; }
  }

  function retrySession() {
    if (busyRef.current) return Promise.resolve();
    setSession((previous) => ({ ...previous, status: "loading", error: null }));
    return recover(true);
  }

  return <AuthContext.Provider value={{ ...session, login, register, logout, retrySession }}>{children}</AuthContext.Provider>;
}
