import { useState } from "react";
import { API_URL } from "../../services/apiClient";
import Icon from "../ui/Icon";

export default function ProfileAvatar({ user, className, iconSize = 24 }) {
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
  const icono = user?.avatar || "user";
  let contenido = user?.avatar || !iniciales
    ? <Icon name={icono} size={iconSize} />
    : iniciales;

  if (version && version !== fotoConError) {
    contenido = (
      <img
        key={version}
        className="profile-avatar__photo"
        src={`${API_URL}/usuarios/me/foto?v=${encodeURIComponent(version)}`}
        crossOrigin="use-credentials"
        alt=""
        onError={() => setFotoConError(version)}
      />
    );
  }

  return <span className={className} aria-hidden="true">{contenido}</span>;
}