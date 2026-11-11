import { useCallback, useEffect, useRef, useState } from "react";
import { agregarAColeccion, obtenerColeccion } from "../services/coleccionApi";
import { errorMessage } from "../utils/errorMessage";
import { COLLECTION_CHANGED_EVENT } from "../utils/collectionEvents";
import { useAuth } from "../auth/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

// Sólo se comparten altas en curso, sin mantener una caché de la colección.
// Si se vuelve a Descubrir durante un POST, su resultado llega a la nueva vista.
const altasEnCurso = new Map();
const suscriptores = new Set();
function notificar(cambio) {
  suscriptores.forEach((suscriptor) => suscriptor(cambio));
}

export default function useCatalogCollection() {
  const { status, user, sessionKey } = useAuth();
  const verified = user?.email_verificado === true;
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const pendientes = useCallback(() => new Set([...altasEnCurso].filter(([, scope]) => scope === sessionKey).map(([id]) => id)), [sessionKey]);
  const [guardadas, setGuardadas] = useState(new Map());
  const [guardandoIds, setGuardandoIds] = useState(pendientes);
  const [errores, setErrores] = useState(new Map());
  const [estadoColeccion, setEstadoColeccion] = useState("loading");
  const [errorColeccion, setErrorColeccion] = useState(null);
  const [intento, setIntento] = useState(0);
  const [anuncio, setAnuncio] = useState("");
  const guardadasRef = useRef(new Map());
  const confirmadasRef = useRef(new Set());
  const estadoRef = useRef("loading");
  const consultaRef = useRef(null);

  useEffect(() => {
    function recibirCambio(cambio) {
      if (cambio.scope !== sessionKey) return;
      setGuardandoIds(pendientes());
      if (cambio.tipo === "guardada") {
        confirmadasRef.current.add(cambio.id);
        if (!guardadasRef.current.has(cambio.id)) guardadasRef.current.set(cambio.id, null);
        setGuardadas(new Map(guardadasRef.current));
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
    if (status !== "authenticated" || !verified) {
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
      const peliculas = new Map(datos.map((pelicula) => [Number(pelicula.id_tmdb), pelicula]));
      for (const id of confirmadasRef.current) {
        if (!peliculas.has(id)) peliculas.set(id, null);
      }
      guardadasRef.current = peliculas;
      setGuardadas(peliculas);
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
  }, [intento, status, sessionKey, pendientes, verified]);

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

  function puedeAgregar(pelicula) {
    const from = `${pathname}${search}`;
    if (status === "authenticated" && !verified) {
      navigate("/verificar-email", { state: { email: user.email, from } });
      return false;
    }
    if (status !== "authenticated") {
      navigate("/login", { state: { from } });
      return false;
    }
    const id = Number(pelicula.id_tmdb);
    return estadoRef.current === "ready" && !guardadasRef.current.has(id) && altasEnCurso.get(id) !== sessionKey;
  }

  async function agregar(pelicula) {
    if (!puedeAgregar(pelicula)) return null;
    const id = Number(pelicula.id_tmdb);
    altasEnCurso.set(id, sessionKey);
    setAnuncio("");
    notificar({ tipo: "inicio", id, scope: sessionKey });
    let resultado;
    try {
      const guardada = await agregarAColeccion(id);
      resultado = { tipo: "guardada", id, idColeccion: guardada.id, titulo: pelicula.titulo };
    } catch (error) {
      resultado = error.message === "Esta película ya está en tu colección"
        ? { tipo: "guardada", id, titulo: pelicula.titulo, existente: true }
        : { tipo: "error", id, error: errorMessage(error) };
    } finally {
      if (altasEnCurso.get(id) === sessionKey) altasEnCurso.delete(id);
    }
    notificar({ ...resultado, scope: sessionKey });
    return resultado;
  }

  return { guardadas, guardandoIds, errores, estadoColeccion, errorColeccion, anuncio, puedeAgregar, agregar, reintentarColeccion };
}
