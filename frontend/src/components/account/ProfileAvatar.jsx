import { useState } from "react";
import { API_URL } from "../../services/apiClient";
import Icon from "../ui/Icon";

export default function ProfileAvatar({ user, className, iconSize = 24, photoPath = "/usuarios/me/foto" }) {
  const [fotoConError, setFotoConError] = useState(null);
  const nombre = user?.nombre_visible || user?.nombre_usuario || "";
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => Array.from(palabra)[0])
    .join("")
    .toLocaleUpperCase("es-AR");

  const version = user?.foto_perfil_version;
  const photoUrl = version ? `${API_URL}${photoPath}?v=${encodeURIComponent(version)}` : null;
  const icono = user?.avatar || "user";
  let contenido = user?.avatar || !iniciales
    ? <Icon name={icono} size={iconSize} />
    : iniciales;

  if (photoUrl && photoUrl !== fotoConError) {
    contenido = (
      <img
        key={photoUrl}
        className="profile-avatar__photo"
        src={photoUrl}
        crossOrigin="use-credentials"
        alt=""
        onError={() => setFotoConError(photoUrl)}
      />
    );
  }

  return <span className={className} aria-hidden="true">{contenido}</span>;
}
