import { useEffect, useState } from "react";
import {
  confirmarVinculacionGoogle,
  iniciarVinculacionGoogle,
  obtenerEstadoVinculacionGoogle,
} from "../../services/authApi";
import { errorMessage } from "../../utils/errorMessage";
import Dialog from "../ui/Dialog";
import Icon from "../ui/Icon";
import GoogleAccess from "./GoogleAccess";
import PasswordField from "./PasswordField";

export default function GoogleVinculacion() {
  const [estado, setEstado] = useState(null);
  const [credencial, setCredencial] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerEstadoVinculacionGoogle()
      .then((datos) => { if (activo) setEstado(datos); })
      .catch((cause) => { if (activo) setError(errorMessage(cause)); });
    return () => { activo = false; };
  }, []);

  function cerrar() {
    setCredencial("");
    setPassword("");
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (guardando) return;

    setGuardando(true);
    setError("");

    try {
      await confirmarVinculacionGoogle(credencial, password);
      setEstado({ ...estado, vinculado: true });
      cerrar();
    } catch (cause) {
      setPassword("");
      if (cause.code === "PASSWORD_INCORRECTA") {
        setError("La contraseña de Muvis es incorrecta.");
      } else if (cause.code === "GOOGLE_CORREO_NO_VALIDO") {
        setCredencial("");
        setError("Elegí en Google el mismo correo que usás en Muvis.");
      } else if (cause.code === "GOOGLE_REINICIAR") {
        setCredencial("");
        setError("Volvé a elegir tu cuenta de Google para continuar.");
      } else {
        setError(errorMessage(cause));
      }
    } finally {
      setGuardando(false);
    }
  }

  if (!estado) return error ? <p role="alert">{error}</p> : null;
  if (estado.vinculado) return <p className="google-link__status" role="status"><Icon name="check" size={17} />Google vinculado.</p>;
  if (!estado.puede_vincular) return null;

  return (
    <div className="google-link">
      {credencial ? (
        <Dialog
          className="google-account-dialog"
          title="Vincular Google"
          description="Confirmá tu contraseña de Muvis para vincular tu cuenta de Google."
          onClose={cerrar}
          busy={guardando}
        >
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          <form className="auth-form" onSubmit={submit}>
            <PasswordField
              id="google-link-password"
              label="Contraseña de Muvis"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={guardando}
              maxLength={128}
              focusOnOpen
            />
            <button className="button button--primary" type="submit" disabled={guardando}>
              {guardando ? "Vinculando…" : "Confirmar vinculación"}
            </button>
          </form>
        </Dialog>
      ) : (
        <>
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          <GoogleAccess iniciar={iniciarVinculacionGoogle} onCredential={(credential) => {
            setError("");
            setCredencial(credential);
          }} />
        </>
      )}
    </div>
  );
}
