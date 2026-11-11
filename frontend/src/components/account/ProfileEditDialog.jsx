import { useId, useState } from "react";
import Dialog from "../ui/Dialog";
import Icon from "../ui/Icon";
import { useAuth } from "../../auth/useAuth";
import ProfilePhotoDialog from "./ProfilePhotoDialog";

const avatares = [
  { id: "", nombre: "Iniciales" },
  { id: "film", nombre: "Película" },
  { id: "star", nombre: "Estrella" },
  { id: "heart", nombre: "Corazón" },
  { id: "bookmark", nombre: "Marcador" },
];

export default function ProfileEditDialog({ user, onSave, onClose }) {
  const id = useId();
  const [inicial] = useState(() => ({
    nombre_visible: user.nombre_visible ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ?? "",
  }));
  const [campos, setCampos] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { guardarFotoPerfil } = useAuth();
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [mensajeFoto, setMensajeFoto] = useState("");

  function cambiarCampo(campo, valor) {
    setCampos((previous) => ({ ...previous, [campo]: valor }));
  }

  async function guardarFoto(foto) {
    await guardarFotoPerfil(foto);
    setMensajeFoto(foto === null ? "Foto de perfil eliminada." : "Foto de perfil guardada.");
  }

  async function guardar(event) {
    event.preventDefault();
    if (guardando) return;

    const cambios = {};
    for (const campo of Object.keys(inicial)) {
      const valor = campos[campo].trim();
      if (valor !== inicial[campo]) cambios[campo] = valor || null;
    }

    if (Object.keys(cambios).length === 0) {
      onClose();
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await onSave(cambios);
      onClose();
    } catch (cause) {
      setError(cause.message || "No se pudo guardar tu perfil");
      setGuardando(false);
    }
  }

  if (editandoFoto) {
    return (
      <ProfilePhotoDialog
        user={user}
        onSave={guardarFoto}
        onClose={() => setEditandoFoto(false)}
      />
    );
  }

  return (
    <Dialog title="Editar perfil" onClose={onClose} busy={guardando}>
      <form className="profile-form" onSubmit={guardar}>
        <div>
          <button
            className="button"
            type="button"
            disabled={guardando}
            aria-describedby={mensajeFoto ? `${id}-estado-foto` : undefined}
            data-autofocus={mensajeFoto ? "" : undefined}
            onClick={() => {
              setMensajeFoto("");
              setEditandoFoto(true);
            }}
          >
            {user.foto_perfil_version ? "Cambiar foto" : "Agregar foto"}
          </button>
          {mensajeFoto && (
            <p className="profile-form__photo-status" id={`${id}-estado-foto`} role="status">
              <Icon name="check" size={17} />
              {mensajeFoto}
            </p>
          )}
        </div>
        <label className="profile-form__field">
          Nombre para mostrar
          <input
            value={campos.nombre_visible}
            onChange={(event) => cambiarCampo("nombre_visible", event.target.value)}
            placeholder={user.nombre_usuario}
            maxLength={50}
            disabled={guardando}
            data-autofocus
          />
        </label>

        <label className="profile-form__field">
          Bio
          <textarea
            value={campos.bio}
            onChange={(event) => cambiarCampo("bio", event.target.value)}
            maxLength={200}
            rows={3}
            disabled={guardando}
          />
        </label>

        <fieldset className="profile-form__avatars" disabled={guardando}>
          <legend>Avatar</legend>
          {avatares.map(({ id: avatar, nombre }) => (
            <label className="profile-form__avatar" key={avatar}>
              <input
                className="visually-hidden"
                type="radio"
                name={`${id}-avatar`}
                value={avatar}
                checked={campos.avatar === avatar}
                onChange={() => cambiarCampo("avatar", avatar)}
              />
              <span>
                {avatar && <Icon name={avatar} size={16} />}
                {nombre}
              </span>
            </label>
          ))}
        </fieldset>

        {error && <p className="inline-error" role="alert">{error}</p>}

        <div className="dialog__actions">
          <button className="button" type="button" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button className="button button--primary" type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
