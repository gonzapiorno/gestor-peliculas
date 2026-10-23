import { useCallback, useEffect, useRef, useState } from "react";
import { agregarAColeccion, obtenerColeccion } from "../services/coleccionApi";
import { errorMessage } from "../utils/errorMessage";
import { COLLECTION_CHANGED_EVENT } from "../utils/collectionEvents";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";

// Sólo se comparten altas en curso, sin mantener una caché de la colección.
// Si se vuelve a Descubrir durante un POST, su resultado llega a la nueva vista.
const altasEnCurso = new Map();
const suscriptores = new Set();
function notificar(cambio) {
  suscriptores.forEach((suscriptor) => suscriptor(cambio));
}

export default function useCatalogCollection() {
  const { status, sessionKey } = useAuth();
  const navigate = useNavigate();
  const pendientes = useCallback(() => new Set([...altasEnCurso].filter(([, scope]) => scope === sessionKey).map(([id]) => id)), [sessionKey]);
  const [guardadas, setGuardadas] = useState(new Set());
  const [guardandoIds, setGuardandoIds] = useState(pendientes);
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
      if (cambio.scope !== sessionKey) return;
      setGuardandoIds(pendientes());
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
  }, [sessionKey, pendientes]);

  useEffect(() => {
    if (status !== "authenticated") {
      consultaRef.current = null;
      estadoRef.current = status === "loading" ? "loading" : "anonymous";
      setEstadoColeccion(estadoRef.current);
      return;
    }
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
      setGuardandoIds(pendientes());
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
  }, [intento, status, sessionKey, pendientes]);

  useEffect(() => {
    function refrescarColeccion(event) {
      if (event.detail?.tipo === "eliminar") {
        confirmadasRef.current.delete(Number(event.detail.idTmdb));
      }
      estadoRef.current = "loading";
      setEstadoColeccion("loading");
      setErrorColeccion(null);
      setIntento((anterior) => anterior + 1);
    }
    window.addEventListener(COLLECTION_CHANGED_EVENT, refrescarColeccion);
    return () => window.removeEventListener(COLLECTION_CHANGED_EVENT, refrescarColeccion);
  }, []);

  function reintentarColeccion() {
    if (estadoRef.current !== "error") return;
    estadoRef.current = "loading";
    setEstadoColeccion("loading");
    setErrorColeccion(null);
    setIntento((anterior) => anterior + 1);
  }

  async function agregar(pelicula) {
    if (status !== "authenticated") {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    const id = Number(pelicula.id_tmdb);
    if (estadoRef.current !== "ready" || guardadasRef.current.has(id) || altasEnCurso.get(id) === sessionKey) return;
    altasEnCurso.set(id, sessionKey);
    setAnuncio("");
    notificar({ tipo: "inicio", id, scope: sessionKey });
    let resultado;
    try {
      await agregarAColeccion(id);
      resultado = { tipo: "guardada", id, titulo: pelicula.titulo };
    } catch (error) {
      resultado = error.message === "Esta película ya está en tu colección"
        ? { tipo: "guardada", id, titulo: pelicula.titulo, existente: true }
        : { tipo: "error", id, error: errorMessage(error) };
    } finally {
      if (altasEnCurso.get(id) === sessionKey) altasEnCurso.delete(id);
    }
    notificar({ ...resultado, scope: sessionKey });
  }

  return { guardadas, guardandoIds, errores, estadoColeccion, errorColeccion, anuncio, agregar, reintentarColeccion };
}
