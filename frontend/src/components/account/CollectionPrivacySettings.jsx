import { useId } from "react";
import Icon from "../ui/Icon";

const listas = [
  { campo: "coleccion_visible_amigos", titulo: "Películas vistas y notas", icono: "check" },
  { campo: "pendientes_visibles_amigos", titulo: "Películas pendientes", icono: "clock" },
];

export default function CollectionPrivacySettings({ valores, onChange, disabled, guardando }) {
  const id = useId();
  return listas.map(({ campo, titulo, icono }) => {
    const visible = valores[campo];
    if (typeof visible !== "boolean") return null;
    return (
      <label key={campo} className="account-page__setting account-page__visibility">
        <span className="account-page__setting-icon"><Icon name={icono} size={18} /></span>
        <span className="account-page__setting-content">
          <span className="account-page__setting-title" id={`${id}-${campo}`}>{titulo}</span>
          <span className="account-page__setting-description" id={`${id}-${campo}-estado`}>
            {guardando === campo ? "Guardando…" : visible ? "Visible para tus amigos" : "Solo para vos"}
          </span>
        </span>
        <input className="visually-hidden" type="checkbox" switch="" role="switch"
          aria-labelledby={`${id}-${campo}`} aria-describedby={`${id}-${campo}-estado`}
          checked={visible} disabled={disabled} onChange={(event) => onChange(campo, event.target.checked)} />
        <span className="profile-form__switch" aria-hidden="true" />
      </label>
    );
  });
}
