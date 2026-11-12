import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { actualizarEstado, actualizarFavorita, actualizarPuntuacion } from "../../services/coleccionApi";
import { notificarCambioColeccion } from "../../utils/collectionEvents";
import { errorMessage } from "../../utils/errorMessage";
import Dialog from "../ui/Dialog";
import Icon from "../ui/Icon";
import RatingSlider from "./RatingSlider";
import "./RatingDialog.css";
import "./CatalogAddDialog.css";

const opciones = [
  { valor: "pendiente", icono: "clock", etiqueta: "Pendiente de ver" },
  { valor: "vista", icono: "check", etiqueta: "Ya la vi" },
];

export default function CatalogAddDialog({ pelicula, onAdd, onClose }) {
  const id = useId();
  const operacion = useRef(false);
  const [estado, setEstado] = useState("pendiente");
  const [favorita, setFavorita] = useState(false);
  const [nota, setNota] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [existente, setExistente] = useState(false);
  const [error, setError] = useState("");

  async function guardar(event) {
    event.preventDefault();
    if (operacion.current) return;
    operacion.current = true;
    setGuardando(true);
    setError("");

    let idColeccion = progreso?.idColeccion;
    let siguiente = progreso?.siguiente ?? 0;
    try {
      if (!idColeccion) {
        const resultado = await onAdd(pelicula);
        if (resultado?.existente) {
          setExistente(true);
          notificarCambioColeccion("agregar", pelicula.id_tmdb);
          return;
        }
        if (resultado?.tipo !== "guardada") {
          setError(resultado?.error || "No pudimos guardar la película. Volvé a intentar.");
          return;
        }
        idColeccion = resultado.idColeccion;
      }

      const cambios = [];
      if (estado === "vista") cambios.push(() => actualizarEstado(idColeccion, "vista"));
      if (favorita) cambios.push(() => actualizarFavorita(idColeccion, true));
      if (estado === "vista" && nota != null) cambios.push(() => actualizarPuntuacion(idColeccion, nota));

      // El alta y cada cambio se guardan por separado. Un reintento continúa desde el paso que falló.
      for (; siguiente < cambios.length; siguiente += 1) {
        await cambios[siguiente]();
      }
      onClose();
    } catch (cause) {
      if (idColeccion) setProgreso({ idColeccion, siguiente });
      setError(errorMessage(cause));
    } finally {
      if (idColeccion) notificarCambioColeccion("agregar", pelicula.id_tmdb);
      operacion.current = false;
      setGuardando(false);
    }
  }

  const camposBloqueados = guardando || Boolean(progreso);
  const etiquetaGuardar = estado === "pendiente" ? "Guardar en pendientes" : "Guardar como vista";

  return (
    <Dialog className="catalog-add-dialog dialog--enter" title="Agregar a mi colección" description={pelicula.titulo} onClose={onClose} busy={guardando}>
      {existente ? (
        <>
          <p role="status">Esta película ya está en tu colección.</p>
          <div className="dialog__actions"><Link className="button button--primary" to="/coleccion" onClick={onClose}>Ir a mi colección</Link></div>
        </>
      ) : (
        <form className="catalog-add" onSubmit={guardar}>
          <fieldset className="catalog-add__choices" disabled={camposBloqueados}>
            <legend>¿Ya la viste?</legend>
            <div>
              {opciones.map(({ valor, icono, etiqueta }) => (
                <label key={valor} className="catalog-add__choice">
                  <input type="radio" name={id} value={valor} checked={estado === valor} onChange={() => setEstado(valor)} data-autofocus={valor === "pendiente" ? "" : undefined} />
                  <Icon name={icono} size={18} />
                  <span>{etiqueta}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {estado === "vista" && (
            <div className="catalog-add__rating">
              <p className="catalog-add__rating-label">Tu puntuación <span>(opcional)</span></p>
              <RatingSlider nota={nota} onChange={setNota} disabled={camposBloqueados} />
              {nota != null && (
                <button className="rating-dialog__clear" type="button" onClick={() => setNota(null)} disabled={camposBloqueados}>
                  Quitar puntuación y dejar sin puntuar
                </button>
              )}
            </div>
          )}
          {error && <p className="inline-error" role="alert">{progreso ? `La película se agregó. Quedaron cambios sin guardar. ${error}` : error}</p>}
          <div className="catalog-add__footer">
            <button className="icon-button catalog-add__favorite" type="button" aria-label="Favorita" aria-pressed={favorita} title={favorita ? "Quitar de favoritas" : "Marcar como favorita"} onClick={() => setFavorita(!favorita)} disabled={camposBloqueados}>
              <Icon name="heart" size={22} />
            </button>
            <div className="dialog__actions">
              <button type="button" className="button" onClick={onClose} disabled={guardando}>{progreso ? "Cerrar" : "Cancelar"}</button>
              <button type="submit" className="button button--primary" disabled={guardando}>
                {guardando ? "Guardando…" : progreso ? "Reintentar cambios" : etiquetaGuardar}
              </button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
