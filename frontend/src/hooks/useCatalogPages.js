import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerPaginaCatalogo } from "../services/catalogoApi";
import { errorMessage } from "../utils/errorMessage";

const vistas = new Map();
const paginaInicial = { peliculas: [], siguiente: 1, limite: 0 };

// Al volver con el historial, recuperamos las páginas cargadas en esa vista.
export default function useCatalogPages(categoria, entry, { columnas = 1, cantidadInicial = 20, decada = null } = {}) {
  const clave = `${entry}:${categoria}:${decada ?? ""}`;
  const [previa] = useState(() => vistas.get(clave));
  const [datos, setDatos] = useState(previa ?? paginaInicial);
  const [cargando, setCargando] = useState(Boolean(categoria && !previa));
  const [error, setError] = useState(null);
  const enCurso = useRef(false);
  const vigente = useRef(false);

  useEffect(() => {
    vigente.current = true;
    return () => { vigente.current = false; };
  }, []);

  const guardarVista = useCallback((vista) => {
    vistas.delete(clave);
    vistas.set(clave, vista);
    if (vistas.size > 30) vistas.delete(vistas.keys().next().value);
    setDatos(vista);
  }, [clave]);

  const cargarHasta = useCallback((anterior, objetivo) => {
    if (!categoria || enCurso.current || anterior.siguiente === null) return;
    enCurso.current = true;
    async function buscarPaginas() {
      const peliculas = new Map(anterior.peliculas.map((pelicula) => [pelicula.id_tmdb, pelicula]));
      let siguiente = anterior.siguiente;
      while (siguiente !== null && peliculas.size < objetivo) {
        const pagina = await obtenerPaginaCatalogo(categoria, siguiente, decada);
        if (!vigente.current) return null;
        for (const pelicula of pagina.peliculas) peliculas.set(pelicula.id_tmdb, pelicula);
        siguiente = pagina.siguiente_pagina;
      }
      return { peliculas: [...peliculas.values()], siguiente, limite: objetivo };
    }

    buscarPaginas()
      .then((vista) => {
        if (vista && vigente.current) guardarVista(vista);
      })
      .catch((cause) => {
        if (vigente.current) setError(cause);
      })
      .finally(() => {
        enCurso.current = false;
        if (vigente.current) setCargando(false);
      });
  }, [categoria, decada, guardarVista]);

  useEffect(() => {
    if (!previa) cargarHasta(paginaInicial, cantidadInicial);
  }, [cantidadInicial, cargarHasta, previa]);

  const limiteEnFilas = Math.max(columnas, Math.floor(datos.limite / columnas) * columnas);
  const disponiblesEnFilas = Math.floor(datos.peliculas.length / columnas) * columnas;
  const visibles = datos.siguiente === null
    ? datos.peliculas
    : datos.peliculas.slice(0, Math.min(limiteEnFilas, disponiblesEnFilas || datos.peliculas.length));

  function cargarMas() {
    if (enCurso.current || datos.siguiente === null) return;
    const objetivo = datos.peliculas.length === 0
      ? cantidadInicial
      : limiteEnFilas + Math.max(columnas, Math.floor(20 / columnas) * columnas);
    setCargando(true);
    setError(null);
    cargarHasta(datos, objetivo);
  }

  return {
    peliculas: visibles,
    hayMas: datos.siguiente !== null,
    cargando,
    error: error ? errorMessage(error) : null,
    errorStatus: error?.status,
    cargarMas,
  };
}
