import { useEffect, useRef, useState } from "react";
import Dialog from "../ui/Dialog";
import ProfileAvatar from "./ProfileAvatar";

const TAMANO = 320;
const MAX_BYTES = 8 * 1024 * 1024;
const CENTRO = { x: 0.5, y: 0.5, zoom: 1 };

function medirRecorte(imagen, zoom) {
  const ancho = imagen.naturalWidth;
  const alto = imagen.naturalHeight;
  const lado = Math.min(ancho, alto) / zoom;

  return { lado, maxX: ancho - lado, maxY: alto - lado };
}

function dibujar(canvas, imagen, encuadre) {
  const contexto = canvas.getContext("2d");
  const { lado, maxX, maxY } = medirRecorte(imagen, encuadre.zoom);

  contexto.fillStyle = "#171b17";
  contexto.fillRect(0, 0, TAMANO, TAMANO);
  contexto.drawImage(
    imagen, encuadre.x * maxX, encuadre.y * maxY, lado, lado,
    0, 0, TAMANO, TAMANO,
  );
}

function limitar(valor) {
  return Math.max(0, Math.min(1, valor));
}

export default function ProfilePhotoDialog({ user, onSave, onClose }) {
  const selector = useRef(null);
  const canvas = useRef(null);
  const arrastre = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [imagen, setImagen] = useState(null);
  const [encuadre, setEncuadre] = useState(CENTRO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!archivo) return;

    const url = URL.createObjectURL(archivo);
    const foto = new Image();

    foto.onload = () => setImagen(foto);
    foto.onerror = () => {
      setArchivo(null);
      setError("No pudimos abrir la imagen. Probá con un JPG, PNG o WebP.");
    };
    foto.src = url;

    return () => {
      foto.onload = null;
      foto.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [archivo]);

  useEffect(() => {
    if (imagen && canvas.current) dibujar(canvas.current, imagen, encuadre);
  }, [imagen, encuadre]);

  function elegirArchivo(event) {
    const elegido = event.currentTarget.files[0];
    event.currentTarget.value = "";
    if (!elegido) return;

    if (elegido.size > MAX_BYTES) {
      setError("Elegí una imagen de hasta 8 MiB.");
      return;
    }

    arrastre.current = null;
    setError("");
    setImagen(null);
    setEncuadre(CENTRO);
    setArchivo(elegido);
  }

  function moverFoto(dx, dy, anchoVista) {
    if (!anchoVista) return;

    setEncuadre((actual) => {
      const { lado, maxX, maxY } = medirRecorte(imagen, actual.zoom);
      const escala = lado / anchoVista;

      return {
        ...actual,
        x: maxX ? limitar(actual.x - dx * escala / maxX) : actual.x,
        y: maxY ? limitar(actual.y - dy * escala / maxY) : actual.y,
      };
    });
  }

  function iniciarArrastre(event) {
    if (guardando || event.button !== 0 || arrastre.current) return;

    arrastre.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function arrastrar(event) {
    const anterior = arrastre.current;
    if (!anterior || anterior.id !== event.pointerId || guardando) return;

    moverFoto(
      event.clientX - anterior.x,
      event.clientY - anterior.y,
      event.currentTarget.getBoundingClientRect().width,
    );
    arrastre.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function moverConTeclado(event) {
    const direccion = {
      ArrowLeft: [-8, 0],
      ArrowRight: [8, 0],
      ArrowUp: [0, -8],
      ArrowDown: [0, 8],
    }[event.key];

    if (!direccion || guardando) return;
    event.preventDefault();
    moverFoto(...direccion, event.currentTarget.getBoundingClientRect().width);
  }

  async function guardar(quitar = false) {
    if (guardando || (!quitar && (!imagen || !canvas.current))) return;

    setGuardando(true);
    setError("");

    try {
      let foto = null;
      if (!quitar) {
        const lienzo = canvas.current;
        dibujar(lienzo, imagen, encuadre);
        foto = await new Promise((resolve) => lienzo.toBlob(resolve, "image/jpeg", 0.9));
        if (!foto) throw new Error("No pudimos preparar la imagen.");
      }

      await onSave(foto);
      onClose();
    } catch (cause) {
      setError(cause.message || "No se pudo actualizar tu foto.");
      setGuardando(false);
    }
  }

  return (
    <Dialog title="Foto de perfil" onClose={onClose} busy={guardando}>
      <div className="profile-photo">
        <input
          ref={selector}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={elegirArchivo}
          disabled={guardando}
          hidden
        />

        {imagen ? (
          <>
            <canvas
              ref={canvas}
              className="profile-photo__preview"
              width={TAMANO}
              height={TAMANO}
              tabIndex={0}
              aria-label="Vista previa. Usá las flechas para mover la foto."
              onKeyDown={moverConTeclado}
              onPointerDown={iniciarArrastre}
              onPointerMove={arrastrar}
              onLostPointerCapture={(event) => {
                if (arrastre.current?.id === event.pointerId) arrastre.current = null;
              }}
            />
            <label className="profile-photo__zoom">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={encuadre.zoom}
                disabled={guardando}
                onChange={(event) => {
                  const zoom = Number(event.target.value);
                  setEncuadre((actual) => ({ ...actual, zoom }));
                }}
              />
            </label>
          </>
        ) : (
          <ProfileAvatar user={user} className="account-page__avatar" iconSize={40} />
        )}

        <button className="button" type="button" disabled={guardando}
          onClick={() => selector.current?.click()} data-autofocus>
          {archivo ? "Elegir otra foto" : "Elegir foto"}
        </button>

        {archivo && !imagen && <p role="status">Abriendo imagen…</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}

        <div className="dialog__actions">
          {user.foto_perfil_version && !archivo && (
            <button className="button button--danger" type="button"
              onClick={() => guardar(true)} disabled={guardando}>
              Quitar foto
            </button>
          )}
          <button className="button" type="button" onClick={onClose} disabled={guardando}>
            Volver
          </button>
          {imagen && (
            <button className="button button--primary" type="button"
              onClick={() => guardar()} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar foto"}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}