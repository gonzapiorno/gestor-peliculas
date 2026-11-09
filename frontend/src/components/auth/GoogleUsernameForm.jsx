import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { completarAltaGoogle } from "../../services/authApi";
import { errorMessage } from "../../utils/errorMessage";

export default function GoogleUsernameForm({ onRestart }) {
  const { retrySession } = useAuth();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [requiereReinicio, setRequiereReinicio] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (guardando || requiereReinicio) return;

    setGuardando(true);
    setError("");

    try {
      await completarAltaGoogle(nombre.trim());
      await retrySession();
    } catch (cause) {
      if (cause.code === "NOMBRE_USUARIO_OCUPADO") {
        setError("Ese nombre ya está ocupado. Probá con otro.");
      } else if (cause.status === 401 || cause.code === "GOOGLE_REINICIAR") {
        setRequiereReinicio(true);
        setError("Volvé a identificarte con Google para continuar.");
      } else {
        setError(errorMessage(cause));
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-busy={guardando}>
      <div className="auth-form__field">
        <label htmlFor="google-username">Elegí tu nombre de usuario</label>
        <input
          id="google-username"
          name="nombre_usuario"
          autoComplete="username"
          autoCapitalize="none"
          value={nombre}
          onChange={(event) => {
            setNombre(event.target.value);
            setError("");
          }}
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]{3,30}"
          required
          disabled={guardando || requiereReinicio}
          aria-describedby="google-username-hint"
        />
        <p id="google-username-hint" className="auth-form__hint">
          Usá de 3 a 30 letras, números o guiones bajos.
        </p>
      </div>
      {error && <p className="auth-page__error" role="alert">{error}</p>}
      <button
        type="submit"
        className="button button--primary auth-form__submit"
        disabled={guardando || requiereReinicio}
      >
        {guardando ? "Creando cuenta…" : "Crear mi cuenta con Google"}
      </button>
      <button type="button" className="auth-text-button" onClick={onRestart} disabled={guardando}>
        Volver a Google
      </button>
    </form>
  );
}