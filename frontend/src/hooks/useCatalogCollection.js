import { useEffect, useRef, useState } from "react";
import { agregarAColeccion, obtenerColeccion } from "../services/coleccionApi";
import { errorMessage } from "../utils/errorMessage";

// Sólo se comparten altas en curso, sin mantener una caché de la colección.
// Si se vuelve a Descubrir durante un POST, su resultado llega a la nueva vista.
const altasEnCurso = new Set();
const suscriptores = new Set();
function notificar(cambio) {
  suscriptores.forEach((suscriptor) => suscriptor(cambio));
}

export default function useCatalogCollection() {
  const [guardadas, setGuardadas] = useState(new Set());
  const [guardandoIds, setGuardandoIds] = useState(() => new Set(altasEnCurso));
  const [errores, setErrores] = useState(new Map());
  const [estadoColeccion, setEstadoColeccion] = useState("loading");
  const [errorColeccion, setErrorColeccion] = useState(null);
  const [intento, setIntento] = useState(0);
  const [anuncio, setAnuncio] = useState("");
  const guardadasRef = useRef(new Set());
  const confirmadasRef = useRef(new Set());
  const estadoRef = useRef("loading");
  const consultaRef = useRef(null);

  useEffect(() => {
    function recibirCambio(cambio) {
      setGuardandoIds(new Set(altasEnCurso));
      if (cambio.tipo === "guardada") {
        confirmadasRef.current.add(cambio.id);
        guardadasRef.current.add(cambio.id);
        setGuardadas(new Set(guardadasRef.current));
        setAnuncio(cambio.existente
          ? `${cambio.titulo} ya está en tu colección.`
          : `${cambio.titulo} se agregó a tu colección.`);
      }
      setErrores((anteriores) => {
        const siguientes = new Map(anteriores);
        if (cambio.tipo === "error") siguientes.set(cambio.id, cambio.error);
        else siguientes.delete(cambio.id);
        return siguientes;
      });
    }
    suscriptores.add(recibirCambio);
    return () => suscriptores.delete(recibirCambio);
  }, []);

  useEffect(() => {
    let vigente = true;
    // StrictMode reutiliza esta promesa durante su doble ejecución de efectos.
    if (consultaRef.current?.intento !== intento) {
      consultaRef.current = { intento, promesa: obtenerColeccion() };
    }
    consultaRef.current.promesa.then((datos) => {
      if (!vigente) return;
      const ids = new Set([...datos.map((pelicula) => Number(pelicula.id_tmdb)), ...confirmadasRef.current]);
      guardadasRef.current = ids;
      setGuardadas(ids);
      setGuardandoIds(new Set(altasEnCurso));
      estadoRef.current = "ready";
      setEstadoColeccion("ready");
      setErrorColeccion(null);
    }).catch((error) => {
      if (!vigente) return;
      estadoRef.current = "error";
      setEstadoColeccion("error");
      setErrorColeccion(errorMessage(error));
    });
    return () => { vigente = false; };
  }, [intento]);

  function reintentarColeccion() {
    if (estadoRef.current !== "error") return;
    estadoRef.current = "loading";
    setEstadoColeccion("loading");
    setErrorColeccion(null);
    setIntento((anterior) => anterior + 1);
  }

  async function agregar(pelicula) {
    const id = Number(pelicula.id_tmdb);
    if (estadoRef.current !== "ready" || guardadasRef.current.has(id) || altasEnCurso.has(id)) return;
    altasEnCurso.add(id);
    setAnuncio("");
    notificar({ tipo: "inicio", id });
    let resultado;
    try {
      await agregarAColeccion(id);
      resultado = { tipo: "guardada", id, titulo: pelicula.titulo };
    } catch (error) {
      resultado = error.message === "Esta película ya está en tu colección"
        ? { tipo: "guardada", id, titulo: pelicula.titulo, existente: true }
        : { tipo: "error", id, error: errorMessage(error) };
    } finally {
      altasEnCurso.delete(id);
    }
    notificar(resultado);
  }

  return { guardadas, guardandoIds, errores, estadoColeccion, errorColeccion, anuncio, agregar, reintentarColeccion };
}
