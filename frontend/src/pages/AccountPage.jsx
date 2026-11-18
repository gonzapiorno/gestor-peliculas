import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { AccountSession } from "../components/layout/Header";
import GoogleVinculacion from "../components/auth/GoogleVinculacion";
import FeedbackPanel from "../components/ui/FeedbackPanel";
import Icon from "../components/ui/Icon";
import ProfileEditDialog from "../components/account/ProfileEditDialog";
import ProfileAvatar from "../components/account/ProfileAvatar";
import ProfileFeaturedMovies from "../components/account/ProfileFeaturedMovies";
import { collectionStatistics } from "../components/movies/collectionStatistics";
import { obtenerColeccion } from "../services/coleccionApi";
import { obtenerAmistades } from "../services/amistadesApi";
import { COLLECTION_CHANGED_EVENT } from "../utils/collectionEvents";
import { errorMessage } from "../utils/errorMessage";
import "./AccountPage.css";

const formatoCantidad = new Intl.NumberFormat("es-AR");
const formatoNota = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function ResumenCuenta({ coleccion, amigos }) {
  const cantidades = coleccion ? collectionStatistics(coleccion) : null;
  return (
    <dl className="account-page__summary" aria-label="Resumen de tu cuenta">
      <div>
        <dt>Colección</dt>
        <dd>{cantidades ? formatoCantidad.format(cantidades.todas) : "—"}</dd>
      </div>
      <div>
        <dt>Vistas</dt>
        <dd>{cantidades ? formatoCantidad.format(cantidades.vistas) : "—"}</dd>
      </div>
      <div className="account-page__average">
        <dt>Promedio</dt>
        <dd>
          {cantidades?.promedio != null
            ? <>{formatoNota.format(cantidades.promedio)}<Icon name="star" size={12} /><span className="visually-hidden"> de 10</span></>
            : <span title={cantidades ? "Todavía no puntuaste películas" : "Dato no disponible"}>—</span>}
        </dd>
      </div>
      <div>
        <dt>Amigos</dt>
        <dd>{amigos ? formatoCantidad.format(amigos.length) : "—"}</dd>
      </div>
    </dl>
  );
}

function CuentaAutenticada({ user }) {
  const { guardarPerfil } = useAuth();
  const [feedbackAbierto, setFeedbackAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [intento, setIntento] = useState(0);
  const [guardandoVisibilidad, setGuardandoVisibilidad] = useState(false);
  const [errorVisibilidad, setErrorVisibilidad] = useState("");
  const [mensajeVisibilidad, setMensajeVisibilidad] = useState("");
  const consulta = useRef(null);
  const cambioVisibilidad = useRef(false);
  const verificado = user.email_verificado === true;

  useEffect(() => {
    if (!verificado) return;
    let vigente = true;
    if (consulta.current?.intento !== intento) {
      consulta.current = { intento, promesa: Promise.allSettled([obtenerColeccion(), obtenerAmistades()]) };
    }
    consulta.current.promesa.then(([coleccion, amistades]) => {
      if (!vigente) return;
      setResumen({
        coleccion: coleccion.status === "fulfilled" ? coleccion.value : null,
        amigos: amistades.status === "fulfilled" ? amistades.value.amigos : null,
        error: coleccion.status === "rejected" || amistades.status === "rejected",
      });
    });
    return () => { vigente = false; };
  }, [intento, verificado]);

  useEffect(() => {
    function actualizarResumen() { setIntento((anterior) => anterior + 1); }
    window.addEventListener(COLLECTION_CHANGED_EVENT, actualizarResumen);
    return () => window.removeEventListener(COLLECTION_CHANGED_EVENT, actualizarResumen);
  }, []);

  async function cambiarVisibilidad(compartir) {
    if (cambioVisibilidad.current) return;
    cambioVisibilidad.current = true;
    setGuardandoVisibilidad(true);
    setErrorVisibilidad("");
    setMensajeVisibilidad("");
    try {
      await guardarPerfil({ coleccion_visible_amigos: compartir });
      setMensajeVisibilidad(compartir
        ? "Tus amigos ya pueden ver tus películas vistas y sus notas."
        : "Tu colección ahora es privada.");
    } catch (error) {
      setErrorVisibilidad(errorMessage(error));
    } finally {
      cambioVisibilidad.current = false;
      setGuardandoVisibilidad(false);
    }
  }

  return (
    <>
      <section className="account-page__profile" aria-labelledby="account-profile-heading">
        <div className="account-page__profile-heading">
          <ProfileAvatar user={user} className="account-page__avatar" iconSize={32} />
          <div className="account-page__identity">
            <h2 id="account-profile-heading">{user.nombre_visible || user.nombre_usuario}</h2>
            <p className="account-page__handle">@{user.nombre_usuario}</p>
          </div>
        </div>
        {user.bio && <p className="account-page__bio">{user.bio}</p>}
        <button className="button account-page__edit" type="button" disabled={guardandoVisibilidad}
          onClick={() => {
            setMensajeVisibilidad("");
            setErrorVisibilidad("");
            setPerfilAbierto(true);
          }}>
          <Icon name="edit" size={15} />Editar perfil
        </button>
        {verificado && (
          <div aria-busy={resumen === null}>
            <ResumenCuenta coleccion={resumen?.coleccion} amigos={resumen?.amigos} />
            {resumen === null && <span className="visually-hidden" role="status">Cargando resumen de tu cuenta…</span>}
            {resumen?.error && (
              <p className="account-page__summary-error" role="alert">
                No pudimos cargar el resumen completo.
                <button type="button" className="account-page__retry" onClick={() => {
                  setResumen(null);
                  setIntento((anterior) => anterior + 1);
                }}>Reintentar</button>
              </p>
            )}
          </div>
        )}
      </section>

      <ProfileFeaturedMovies coleccion={resumen?.coleccion} />

      <section className="account-page__settings" aria-labelledby="account-settings-heading">
        <h2 id="account-settings-heading"><Icon name="sliders" size={17} />Ajustes de cuenta</h2>
        <div className="account-page__settings-list">
          <div className="account-page__setting account-page__access">
            <span className="account-page__setting-icon"><Icon name="mail" size={18} /></span>
            <div className="account-page__setting-content">
              <h3>Correo electrónico</h3>
              <p>{user.email || "No disponible"}</p>
              {verificado && import.meta.env.VITE_GOOGLE_CLIENT_ID && <GoogleVinculacion key={user.id} />}
            </div>
          </div>
          {typeof user.coleccion_visible_amigos === "boolean" && (
            <label className="account-page__setting account-page__visibility" aria-busy={guardandoVisibilidad}>
              <span className="account-page__setting-icon"><Icon name="users" size={18} /></span>
              <span className="account-page__setting-content">
                <span className="account-page__setting-title">Visibilidad de la colección</span>
                <span className="account-page__setting-description" id="account-visibility-description">
                  {guardandoVisibilidad ? "Guardando…"
                    : user.coleccion_visible_amigos ? "Películas vistas y notas para amigos" : "Películas vistas y notas solo para vos"}
                </span>
              </span>
              <input className="visually-hidden" type="checkbox" role="switch"
                aria-label="Compartir mis películas vistas con amigos" aria-describedby="account-visibility-description"
                checked={user.coleccion_visible_amigos} disabled={guardandoVisibilidad || perfilAbierto}
                onChange={(event) => cambiarVisibilidad(event.target.checked)} />
              <span className="profile-form__switch" aria-hidden="true" />
            </label>
          )}
          <button className="account-page__setting account-page__feedback" type="button"
            onClick={() => setFeedbackAbierto(true)}>
            <span className="account-page__setting-icon"><Icon name="message" size={18} /></span>
            <span className="account-page__setting-content">
              <span className="account-page__setting-title">Dar feedback<span className="beta-badge">BETA</span></span>
              <span className="account-page__setting-description">Ayudanos a mejorar Muvis</span>
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
        {errorVisibilidad && <p className="inline-error" role="alert">{errorVisibilidad}</p>}
        <p className="account-page__notice" role="status">{mensajeVisibilidad}</p>
        <AccountSession variant="page" compact />
      </section>

      {perfilAbierto && <ProfileEditDialog user={user} onSave={guardarPerfil} onClose={() => setPerfilAbierto(false)} />}
      {feedbackAbierto && <FeedbackPanel onClose={() => setFeedbackAbierto(false)} />}
    </>
  );
}

export default function AccountPage() {
  const { user } = useAuth();
  return (
    <main className="account-page page-container">
      <header className="page-heading">
        <h1 className="page-title">Mi cuenta</h1>
        <p className="page-description">{user
          ? "Tu perfil y tu colección, en un solo lugar."
          : "Iniciá sesión para guardar tus películas y continuar tu colección."}</p>
      </header>
      {user ? <CuentaAutenticada key={user.id} user={user} /> : (
        <section className="account-page__profile" aria-label="Acceder a Muvis">
          <AccountSession variant="page" />
        </section>
      )}
    </main>
  );
}
