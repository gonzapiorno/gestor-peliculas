import { useEffect, useRef, useState } from "react";
import {
  guardarDispositivo,
  guardarPreferenciasNotificaciones,
  obtenerPreferenciasNotificaciones,
  quitarDispositivo,
} from "../../services/notificacionesApi";
import { errorMessage } from "../../utils/errorMessage";
import Dialog from "../ui/Dialog";
import "./NotificationSettings.css";

const categorias = [
  { campo: "solicitudes_amistad", titulo: "Solicitudes de amistad", descripcion: "Cuando alguien te manda una solicitud." },
  { campo: "actividad_amigos", titulo: "Actividad de amigos", descripcion: "Cuando un amigo comparte qué está viendo o qué vio." },
];

function clavePush(clave) {
  const base64 = clave.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(clave.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
}

async function identificarDispositivo(suscripcion) {
  if (!suscripcion) return null;
  const bytes = new TextEncoder().encode(suscripcion.endpoint);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function prepararDispositivo() {
  let timeout;
  try {
    const listo = navigator.serviceWorker.register("/notificaciones-sw.js").then(() => navigator.serviceWorker.ready);
    const limite = new Promise((_, reject) => {
      timeout = window.setTimeout(() => reject(new Error("El dispositivo no respondió.")), 8000);
    });
    const registro = await Promise.race([listo, limite]);
    const suscripcion = await registro.pushManager.getSubscription();
    return { registro, suscripcion, id: await identificarDispositivo(suscripcion) };
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function NotificationSettings({ onClose }) {
  const soportado = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const [preferencias, setPreferencias] = useState(null);
  const [dispositivo, setDispositivo] = useState(null);
  const [permiso, setPermiso] = useState(soportado ? Notification.permission : "unsupported");
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorDispositivo, setErrorDispositivo] = useState("");
  const consulta = useRef(null);
  const preparacion = useRef(null);
  const operacion = useRef(false);

  useEffect(() => {
    let vigente = true;
    if (consulta.current?.intento !== intento) {
      consulta.current = { intento, promesa: obtenerPreferenciasNotificaciones() };
    }
    consulta.current.promesa
      .then((datos) => { if (vigente) setPreferencias(datos); })
      .catch((cause) => { if (vigente) setError(errorMessage(cause)); });
    return () => { vigente = false; };
  }, [intento]);

  const clavePublica = preferencias?.clave_publica;
  useEffect(() => {
    if (!soportado || !clavePublica) return;
    let vigente = true;
    if (preparacion.current?.intento !== intento) {
      preparacion.current = {
        intento,
        promesa: prepararDispositivo(),
      };
    }
    preparacion.current.promesa
      .then((datos) => { if (vigente) setDispositivo(datos); })
      .catch(() => { if (vigente) setErrorDispositivo("No pudimos preparar este dispositivo."); });
    function actualizarPermiso() { setPermiso(Notification.permission); }
    document.addEventListener("visibilitychange", actualizarPermiso);
    return () => {
      vigente = false;
      document.removeEventListener("visibilitychange", actualizarPermiso);
    };
  }, [clavePublica, intento, soportado]);

  const activo = Boolean(dispositivo?.id && preferencias?.dispositivos.includes(dispositivo.id));

  async function guardar(accion) {
    if (operacion.current) return;
    operacion.current = true;
    setGuardando(true);
    setError("");
    try {
      await accion();
    } catch (cause) {
      setError(soportado && Notification.permission === "denied" && !activo ? "" : errorMessage(cause));
    } finally {
      if (soportado) setPermiso(Notification.permission);
      operacion.current = false;
      setGuardando(false);
    }
  }

  function activar() {
    if (!dispositivo || !clavePublica) return;
    return guardar(async () => {
      const { registro } = dispositivo;
      const suscripcion = dispositivo.suscripcion ?? await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: clavePush(clavePublica),
      });
      const id = await identificarDispositivo(suscripcion);
      setDispositivo({ registro, suscripcion, id });
      setPreferencias(await guardarDispositivo(suscripcion));
    });
  }

  function desactivar() {
    return guardar(async () => {
      setPreferencias(await quitarDispositivo(dispositivo.suscripcion.endpoint));
      // Si otro registro sigue usando el worker, los avisos se detienen al quitar el destino del servidor.
      await dispositivo.suscripcion.unsubscribe().catch(() => {});
      const suscripcion = await dispositivo.registro.pushManager.getSubscription();
      setDispositivo({ ...dispositivo, suscripcion, id: await identificarDispositivo(suscripcion) });
    });
  }

  function reintentar() {
    setError("");
    setErrorDispositivo("");
    setIntento((valor) => valor + 1);
  }

  return (
    <Dialog title="Notificaciones" className="dialog--enter notification-settings"
      description="Elegí qué avisos querés recibir de Muvis." onClose={onClose} busy={guardando}>
      {!preferencias && !error && <p role="status">Cargando ajustes…</p>}
      {preferencias && (<>
        <div className="account-page__settings-list">
          {categorias.map(({ campo, titulo, descripcion }) => (
            <label className="account-page__setting account-page__visibility" key={campo}>
              <span className="account-page__setting-content">
                <span className="account-page__setting-title">{titulo}</span>
                <span className="account-page__setting-description">{descripcion}</span>
              </span>
              <input type="checkbox" role="switch" className="visually-hidden" aria-label={titulo}
                checked={preferencias[campo]} disabled={guardando}
                onChange={(event) => {
                  const valor = event.target.checked;
                  guardar(async () => setPreferencias(await guardarPreferenciasNotificaciones({ [campo]: valor })));
                }} />
              <span className="profile-form__switch" aria-hidden="true" />
            </label>
          ))}
        </div>
        <div className="notification-settings__device">
          {!soportado && <p>En iPhone, abrí Muvis desde su ícono en la pantalla de inicio para activar avisos.</p>}
          {soportado && !clavePublica && <p>El envío de notificaciones todavía no está disponible.</p>}
          {soportado && permiso === "denied" && (
            <p>El permiso está bloqueado. Podés habilitarlo en los ajustes de notificaciones del dispositivo.</p>
          )}
          {soportado && clavePublica && !errorDispositivo && !dispositivo && permiso !== "denied" && (
            <p role="status">Preparando este dispositivo…</p>
          )}
          {(activo || dispositivo && permiso !== "denied") && (
            <button type="button" className={`button${activo ? "" : " button--primary"}`} disabled={guardando}
              onClick={activo ? desactivar : activar}>
              {activo ? "Desactivar en este dispositivo" : "Activar en este dispositivo"}
            </button>
          )}
        </div>
      </>)}
      {(error || errorDispositivo) && <p className="inline-error" role="alert">{error || errorDispositivo}</p>}
      {(!preferencias && error || errorDispositivo) && <button type="button" className="button" onClick={reintentar}>Reintentar</button>}
    </Dialog>
  );
}
