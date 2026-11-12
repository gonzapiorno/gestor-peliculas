import { useEffect, useState } from "react";
import {
  guardarPeliculaDestacada,
  obtenerPeliculasDestacadas,
} from "../../services/authApi";
import { obtenerColeccion } from "../../services/coleccionApi";
import { errorMessage } from "../../utils/errorMessage";
import Dialog from "../ui/Dialog";
import Icon from "../ui/Icon";
import Poster from "../ui/Poster";
import "./ProfileFeaturedMovies.css";

const POSICIONES = [1, 2, 3, 4];

function normalizar(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
}

function PosterDestacado({ pelicula, animar }) {
  const [cargado, setCargado] = useState(false);
  const clase = animar ? `profile-featured__art${cargado ? " is-loaded" : ""}` : "";

  return (
    <Poster
      src={pelicula.poster}
      title={pelicula.titulo}
      sizes="180px"
      className={clase}
      onLoad={animar ? () => setCargado(true) : undefined}
    />
  );
}

function SelectorDestacada({ actual, destacadas, onGuardar, onClose }) {
  const [coleccion, setColeccion] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [intento, setIntento] = useState(0);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorGuardado, setErrorGuardado] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;

    obtenerColeccion()
      .then((peliculas) => {
        if (vigente) setColeccion(peliculas);
      })
      .catch((error) => {
        if (vigente) setErrorCarga(errorMessage(error));
      });

    return () => { vigente = false; };
  }, [intento]);

  const idsDestacados = new Set(destacadas.map((pelicula) => pelicula.id));
  const consulta = normalizar(busqueda.trim());
  const resultados = coleccion?.filter((pelicula) =>
    normalizar(pelicula.titulo).includes(consulta)
  );

  async function guardar(pelicula) {
    if (guardando) return;

    setGuardando(true);
    setErrorGuardado("");

    try {
      await onGuardar(pelicula);
      onClose();
    } catch (error) {
      if (error.status === 409) {
        setErrorGuardado("Esa película ya está destacada. Recargá Mi cuenta para ver los cambios.");
      } else if (error.status === 404) {
        setErrorGuardado("Esa película ya no está en tu colección. Cerrá el selector y volvé a abrirlo.");
      } else {
        setErrorGuardado(errorMessage(error));
      }
      setGuardando(false);
    }
  }

  return (
    <Dialog
      className="dialog--enter"
      title={actual ? "Cambiar película destacada" : "Elegir película destacada"}
      onClose={onClose}
      busy={guardando}
    >
      <label className="search-field">
        <Icon name="search" size={18} />
        <input
          className="field-input"
          type="search"
          aria-label="Buscar en tu colección"
          placeholder="Buscar en tu colección"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          disabled={guardando}
          data-autofocus
        />
      </label>

      {errorCarga && (
        <div className="inline-error" role="alert">
          <span>{errorCarga}</span>
          <button
            className="button"
            type="button"
            disabled={guardando}
            onClick={() => {
              setErrorCarga("");
              setIntento((valor) => valor + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {!errorCarga && coleccion === null && <p role="status">Cargando colección…</p>}
      {coleccion?.length === 0 && <p>Agregá películas a tu colección para destacarlas.</p>}
      {coleccion?.length > 0 && resultados?.length === 0 && (
        <p role="status">No encontramos películas con ese título.</p>
      )}

      {resultados?.length > 0 && (
        <ul className="featured-picker">
          {resultados.map((pelicula) => {
            const yaDestacada = idsDestacados.has(pelicula.id);

            return (
              <li key={pelicula.id}>
                <button
                  className="button featured-picker__option"
                  type="button"
                  disabled={guardando || yaDestacada}
                  onClick={() => guardar(pelicula)}
                >
                  <span className="featured-picker__poster" aria-hidden="true">
                    <Poster src={pelicula.poster} title={pelicula.titulo} sizes="40px" />
                  </span>
                  <span className="featured-picker__label">
                    {pelicula.titulo}
                    {pelicula.anio && <small>{pelicula.anio}</small>}
                    {yaDestacada && (
                      <small>{actual?.id === pelicula.id ? "Selección actual" : "Ya destacada"}</small>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {errorGuardado && <p className="inline-error" role="alert">{errorGuardado}</p>}
      {guardando && <p role="status">Guardando cambio…</p>}

      <div className="dialog__actions">
        {actual && (
          <button className="button button--danger" type="button"
            disabled={guardando} onClick={() => guardar(null)}>
            Quitar destacada
          </button>
        )}
        <button className="button" type="button" disabled={guardando} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}

export default function ProfileFeaturedMovies() {
  const [destacadas, setDestacadas] = useState(null);
  const [posicion, setPosicion] = useState(null);
  const [intento, setIntento] = useState(0);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [posicionAnimada, setPosicionAnimada] = useState(null);

  useEffect(() => {
    let vigente = true;

    obtenerPeliculasDestacadas()
      .then((peliculas) => {
        if (vigente) setDestacadas(peliculas);
      })
      .catch((error) => {
        if (vigente) setError(errorMessage(error));
      });

    return () => { vigente = false; };
  }, [intento]);

  const porPosicion = new Map(
    (destacadas ?? []).map((pelicula) => [pelicula.posicion_destacada, pelicula])
  );

  async function guardar(pelicula) {
    await guardarPeliculaDestacada(posicion, pelicula?.id ?? null);

    setDestacadas((anteriores) => {
      const siguientes = anteriores.filter((item) => item.posicion_destacada !== posicion);
      if (pelicula) siguientes.push({ ...pelicula, posicion_destacada: posicion });
      return siguientes;
    });

    setPosicionAnimada(pelicula ? posicion : null);
    setMensaje(pelicula ? "Película destacada guardada." : "Película quitada de las destacadas.");
  }

  return (
    <section className="profile-featured" aria-labelledby="profile-featured-heading">
      <h2 id="profile-featured-heading">Películas destacadas</h2>

      {error && (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button
            className="button"
            type="button"
            onClick={() => {
              setError("");
              setIntento((valor) => valor + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && destacadas === null && <p role="status">Cargando destacadas…</p>}

      {destacadas !== null && (
        <ul className="profile-featured__grid">
          {POSICIONES.map((lugar) => {
            const pelicula = porPosicion.get(lugar);

            return (
              <li key={lugar}>
                <button
                  className="profile-featured__slot"
                  type="button"
                  aria-label={pelicula
                    ? `Cambiar ${pelicula.titulo}, película destacada ${lugar}`
                    : `Agregar película destacada ${lugar}`}
                  onClick={() => {
                    setMensaje("");
                    setPosicion(lugar);
                  }}
                >
                  <span className="profile-featured__poster" aria-hidden="true">
                    {pelicula
                      ? <PosterDestacado key={pelicula.id} pelicula={pelicula} animar={lugar === posicionAnimada} />
                      : <Icon name="plus" size={26} />}
                  </span>
                  <span className="profile-featured__title" title={pelicula?.titulo}>
                    {pelicula?.titulo || "Agregar película"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="profile-featured__status" role="status">{mensaje}</p>

      {posicion !== null && (
        <SelectorDestacada
          actual={porPosicion.get(posicion)}
          destacadas={destacadas}
          onGuardar={guardar}
          onClose={() => setPosicion(null)}
        />
      )}
    </section>
  );
}
