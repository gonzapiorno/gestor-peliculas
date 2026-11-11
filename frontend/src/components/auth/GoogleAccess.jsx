import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { enviarCredencialGoogle, iniciarIntentoGoogle } from "../../services/authApi";
import { errorMessage } from "../../utils/errorMessage";
import GoogleUsernameForm from "./GoogleUsernameForm";
import "./GoogleAccess.css";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const mensajeInicial = "Preparando acceso con Google…";

const mensajesPorPaso = {
  vincular: "Ya tenés una cuenta de Muvis con ese correo. Iniciá sesión con tu contraseña.",
  verificar_correo: "Para usar este correo, por ahora registrate con correo y contraseña.",
};

let cargaGoogle;
const intentosPendientes = new Map();

function cargarGoogle() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  cargaGoogle ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;

    function fallar() {
      script.remove();
      reject(new Error("No se pudo cargar el botón de Google"));
    }

    script.onload = () => {
      const googleId = window.google?.accounts?.id;
      if (googleId) resolve(googleId);
      else fallar();
    };
    script.onerror = fallar;
    document.head.appendChild(script);
  }).catch((error) => {
    cargaGoogle = undefined;
    throw error;
  });

  return cargaGoogle;
}

function prepararIntento(iniciar) {
  let pendiente = intentosPendientes.get(iniciar);
  if (!pendiente) {
    pendiente = iniciar().finally(() => intentosPendientes.delete(iniciar));
    intentosPendientes.set(iniciar, pendiente);
  }
  return pendiente;
}

export default function GoogleAccess({ iniciar = iniciarIntentoGoogle, onCredential }) {
  const { retrySession } = useAuth();
  const boton = useRef(null);
  const [intento, setIntento] = useState(0);
  const [mensaje, setMensaje] = useState(mensajeInicial);
  const [error, setError] = useState("");
  const [elegirNombre, setElegirNombre] = useState(false);
  const actualizarSesion = useEffectEvent(() => retrySession());
  const esVinculacion = typeof onCredential === "function";
  const entregarCredencial = useEffectEvent((credential) => onCredential(credential));

  useEffect(() => {
    if (!clientId) return;

    const contenedor = boton.current;
    let activo = true;
    let procesando = false;
    let observarAncho;
    let frameAncho;

    async function prepararBoton() {
      const googleId = await cargarGoogle();
      if (!activo) return;

      const { nonce } = await prepararIntento(iniciar);
      if (!activo) return;

      googleId.initialize({
        client_id: clientId,
        nonce,
        ux_mode: "popup",
        callback: async ({ credential }) => {
          if (!activo || procesando || !credential) return;

          procesando = true;
          contenedor.replaceChildren();
          if (esVinculacion) {
            entregarCredencial(credential);
            return;
          }
          setMensaje("Verificando tu cuenta de Google…");

          try {
            const { paso } = await enviarCredencialGoogle(credential);
            if (!activo) return;

            if (paso === "elegir_nombre") {
              setMensaje("");
              setElegirNombre(true);
              return;
            }

            if (paso === "entrar") {
              await actualizarSesion();
              if (activo) setMensaje("");
              return;
            }

            const siguienteMensaje = mensajesPorPaso[paso];
            if (typeof siguienteMensaje !== "string") {
              throw new Error("Muvis devolvió un paso de acceso desconocido");
            }
            setMensaje(siguienteMensaje);
          } catch (cause) {
            if (activo) setError(errorMessage(cause));
          }
        },
      });

      let anchoAnterior = 0;
      function renderizarBoton() {
        const ancho = Math.min(400, contenedor.clientWidth);
        if (!activo || procesando || ancho === 0 || ancho === anchoAnterior) return;
        anchoAnterior = ancho;
        contenedor.replaceChildren();
        googleId.renderButton(contenedor, {
          theme: "outline_dark",
          shape: "pill",
          size: "large",
          width: String(ancho),
          text: "continue_with",
          locale: "es",
        });
      }

      renderizarBoton();
      if (typeof ResizeObserver === "function") {
        observarAncho = new ResizeObserver(() => {
          if (frameAncho !== undefined || contenedor.clientWidth === anchoAnterior) return;
          frameAncho = window.requestAnimationFrame(() => {
            frameAncho = undefined;
            renderizarBoton();
          });
        });
        observarAncho.observe(contenedor);
      }
      setMensaje("");
    }

    prepararBoton().catch((cause) => {
      if (activo) setError(errorMessage(cause));
    });

    return () => {
      activo = false;
      observarAncho?.disconnect();
      if (frameAncho !== undefined) window.cancelAnimationFrame(frameAncho);
      contenedor.replaceChildren();
    };
  }, [iniciar, intento, esVinculacion]);

  function reintentar() {
    setElegirNombre(false);
    setError("");
    setMensaje(mensajeInicial);
    setIntento((anterior) => anterior + 1);
  }

  if (!clientId) return <p className="auth-page__status">Acceso con Google próximamente.</p>;

  return (
    <div className={`auth-google${esVinculacion ? " auth-google--link" : ""}`}>
      <div className="auth-google__button-slot" ref={boton} />
      {elegirNombre && <GoogleUsernameForm onRestart={reintentar} />}
      {mensaje && !error && <p className="auth-page__status" role="status">{mensaje}</p>}
      {error && (
        <div className="auth-page__error">
          <p role="alert">{error}</p>
          <button className="auth-text-button" type="button" onClick={reintentar}>
            Reintentar con Google
          </button>
        </div>
      )}
    </div>
  );
}
