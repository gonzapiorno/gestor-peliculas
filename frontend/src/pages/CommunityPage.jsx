import { useEffect, useRef, useState } from "react";
import ProfileAvatar from "../components/account/ProfileAvatar";
import Icon from "../components/ui/Icon";
import {
  buscarUsuario,
  enviarSolicitud,
  obtenerAmistades,
  responderSolicitud,
} from "../services/amistadesApi";
import { errorMessage } from "../utils/errorMessage";
import "./CommunityPage.css";

function Persona({ usuario }) {
  return (
    <div className="community-person">
      <ProfileAvatar
        user={usuario}
        className="community-person__avatar"
        iconSize={19}
        photoPath={`/amistades/usuarios/${usuario.id}/foto`}
      />
      <div className="community-person__identity">
        <strong>{usuario.nombre_visible || usuario.nombre_usuario}</strong>
        <span>@{usuario.nombre_usuario}</span>
      </div>
    </div>
  );
}

function Panel({ id, titulo, cantidad, icono, acciones, children }) {
  return (
    <section className={`community-panel community-panel--${id}`} aria-labelledby={`community-${id}`}>
      <header className="community-panel__header">
        <h2 id={`community-${id}`}>
          <Icon name={icono} size={17} />
          {titulo}
          {cantidad > 0 && <span className="community-panel__count">{cantidad}</span>}
        </h2>
        {acciones}
      </header>
      {children}
    </section>
  );
}

function AccionesSolicitud({ solicitud, ocupada, onResponder }) {
  return (
    <div className="community-person__actions">
      <button className="button button--primary" type="button" disabled={ocupada}
        aria-label={`Aceptar solicitud de @${solicitud.usuario.nombre_usuario}`}
        onClick={() => onResponder(solicitud, "aceptada")}>
        Aceptar
      </button>
      <button className="button" type="button" disabled={ocupada}
        aria-label={`Rechazar solicitud de @${solicitud.usuario.nombre_usuario}`}
        onClick={() => onResponder(solicitud, "rechazada")}>
        Rechazar
      </button>
    </div>
  );
}

export default function CommunityPage() {
  const [bandeja, setBandeja] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const [errorBandeja, setErrorBandeja] = useState("");
  const [consulta, setConsulta] = useState("");
  const [busqueda, setBusqueda] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [ocupada, setOcupada] = useState(false);
  const [aviso, setAviso] = useState(null);
  const operacion = useRef(false);

  useEffect(() => {
    let vigente = true;
    obtenerAmistades()
      .then((datos) => { if (vigente) setBandeja(datos); })
      .catch((error) => { if (vigente) setErrorBandeja(errorMessage(error)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [intento]);

  function actualizar() {
    setCargando(true);
    setErrorBandeja("");
    setIntento((valor) => valor + 1);
  }

  async function buscar(event) {
    event.preventDefault();
    if (buscando) return;
    const nombre = consulta.trim();
    if (!/^@?[a-zA-Z0-9_]{3,30}$/.test(nombre)) {
      setBusqueda({ nombre, error: "Ingresá un @usuario de 3 a 30 letras, números o guiones bajos." });
      return;
    }
    setBuscando(true);
    setBusqueda(null);
    try {
      setBusqueda({ nombre, usuario: await buscarUsuario(nombre) });
    } catch (error) {
      setBusqueda({ nombre, error: error.status === 404 ? "" : errorMessage(error) });
    } finally {
      setBuscando(false);
    }
  }

  async function cambiarAmistad(accion, alCompletar) {
    if (operacion.current || cargando || !bandeja) return;
    operacion.current = true;
    setOcupada(true);
    setAviso(null);
    try {
      const respuesta = await accion();
      alCompletar(respuesta);
    } catch (error) {
      const mensaje = error.status === 409
        ? "Ya existe una solicitud o amistad entre estas cuentas."
        : error.status === 404
          ? "La cuenta o la solicitud ya no está disponible."
          : errorMessage(error);
      setAviso({ mensaje, error: true });
      if (error.status === 404 || error.status === 409) actualizar();
    } finally {
      operacion.current = false;
      setOcupada(false);
    }
  }

  function enviar(usuario) {
    return cambiarAmistad(() => enviarSolicitud(usuario.id), (solicitud) => {
      setBandeja((anterior) => ({
        ...anterior,
        enviadas: [{ id: solicitud.id, usuario }, ...anterior.enviadas],
      }));
      setAviso({ mensaje: `Solicitud enviada a @${usuario.nombre_usuario}.` });
      actualizar();
    });
  }

  function responder(solicitud, estado) {
    return cambiarAmistad(() => responderSolicitud(solicitud.id, estado), () => {
      const aceptada = estado === "aceptada";
      setBandeja((anterior) => ({
        ...anterior,
        recibidas: anterior.recibidas.filter((item) => item.id !== solicitud.id),
        amigos: aceptada ? [solicitud.usuario, ...anterior.amigos] : anterior.amigos,
      }));
      setAviso({ mensaje: aceptada ? "Solicitud aceptada." : "Solicitud rechazada." });
    });
  }

  const resultado = busqueda?.nombre === consulta.trim() ? busqueda : null;
  const usuarioEncontrado = resultado?.usuario;
  const recibida = bandeja?.recibidas.find((item) => item.usuario.id === usuarioEncontrado?.id);
  const enviada = bandeja?.enviadas.find((item) => item.usuario.id === usuarioEncontrado?.id);
  const amigo = bandeja?.amigos.find((usuario) => usuario.id === usuarioEncontrado?.id);
  const perfilEncontrado = amigo ?? recibida?.usuario ?? enviada?.usuario ?? usuarioEncontrado;
  const accionesBloqueadas = ocupada || cargando || !bandeja;

  return (
    <main className="community-page page-container">
      <header className="page-heading">
        <p className="eyebrow">Cine en comunidad</p>
        <h1 className="page-title">Comunidad</h1>
        <p className="page-description">Encontrá a tus amigos en Muvis y enviá solicitudes de amistad.</p>
      </header>

      {aviso && <p className={aviso.error ? "inline-error" : "community-notice"} role={aviso.error ? "alert" : "status"}>{aviso.mensaje}</p>}
      {errorBandeja && (
        <div className="inline-error" role="alert">
          <span>{errorBandeja}</span>
          <button className="button" type="button" disabled={accionesBloqueadas && Boolean(bandeja)} onClick={actualizar}>
            Reintentar
          </button>
        </div>
      )}

      <div className="community-grid">
        <Panel id="buscar" titulo="Buscador de cinéfilos" icono="search">
          <form className="community-search" onSubmit={buscar} role="search" aria-label="Buscar cinéfilos">
            <label className="visually-hidden" htmlFor="community-username">Buscar por @usuario</label>
            <input id="community-username" className="field-input" type="search"
              placeholder="@usuario" value={consulta} onChange={(event) => setConsulta(event.target.value)}
              maxLength={64} autoCapitalize="none" autoComplete="off" spellCheck={false} />
            <button className="button button--primary" type="submit" disabled={buscando || !consulta.trim()}>
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </form>
          {resultado?.error && <p className="community-message community-message--error" role="alert">{resultado.error}</p>}
          {resultado && resultado.error === "" && <p className="community-message" role="status">No encontramos ese usuario.</p>}
          {usuarioEncontrado && (
            <div className="community-row community-row--result">
              <Persona usuario={perfilEncontrado} />
              {amigo ? <span className="community-badge"><Icon name="check" size={15} />Amigos</span>
                : enviada ? <span className="community-badge"><Icon name="clock" size={15} />Solicitud enviada</span>
                  : recibida ? <a className="community-link" href="#community-recibidas">Ver solicitud recibida</a>
                    : <button className="button button--primary" type="button" disabled={accionesBloqueadas}
                      onClick={() => enviar(usuarioEncontrado)}>
                      <Icon name="plus" size={17} />Enviar solicitud
                    </button>}
            </div>
          )}
        </Panel>

        <Panel id="amigos" titulo="Tus amigos" icono="users" cantidad={bandeja?.amigos.length}
          acciones={<button className="icon-button community-refresh" type="button" aria-label="Actualizar amistades"
            disabled={cargando || ocupada} onClick={actualizar}><Icon name="refresh" size={18} /></button>}>
          {cargando && <p className="community-message" role="status">{bandeja ? "Actualizando amistades…" : "Cargando amistades…"}</p>}
          {bandeja?.amigos.length > 0 ? (
            <ul className="community-list">
              {bandeja.amigos.map((usuario) => <li className="community-row" key={usuario.id}><Persona usuario={usuario} /></li>)}
            </ul>
          ) : bandeja && !cargando && <p className="community-message">Todavía no tenés amigos en Muvis.</p>}
        </Panel>

        <Panel id="recibidas" titulo="Solicitudes recibidas" icono="message" cantidad={bandeja?.recibidas.length}>
          {bandeja?.recibidas.length > 0 ? (
            <ul className="community-list">
              {bandeja.recibidas.map((solicitud) => (
                <li className="community-row" key={solicitud.id}>
                  <Persona usuario={solicitud.usuario} />
                  <AccionesSolicitud solicitud={solicitud} ocupada={accionesBloqueadas} onResponder={responder} />
                </li>
              ))}
            </ul>
          ) : bandeja && <p className="community-message">No tenés solicitudes para responder.</p>}
        </Panel>

        <Panel id="enviadas" titulo="Solicitudes enviadas" icono="clock" cantidad={bandeja?.enviadas.length}>
          {bandeja?.enviadas.length > 0 ? (
            <ul className="community-list">
              {bandeja.enviadas.map((solicitud) => (
                <li className="community-row community-row--sent" key={solicitud.id}>
                  <Persona usuario={solicitud.usuario} />
                  <span className="community-badge"><Icon name="clock" size={15} />Pendiente</span>
                </li>
              ))}
            </ul>
          ) : bandeja && <p className="community-message">No tenés solicitudes enviadas pendientes.</p>}
        </Panel>
      </div>
    </main>
  );
}
