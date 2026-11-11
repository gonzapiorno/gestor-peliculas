import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { AccountSession } from "../components/layout/Header";
import GoogleVinculacion from "../components/auth/GoogleVinculacion";
import FeedbackPanel from "../components/ui/FeedbackPanel";
import Icon from "../components/ui/Icon";
import ProfileEditDialog from "../components/account/ProfileEditDialog";
import ProfileAvatar from "../components/account/ProfileAvatar";
import "./AccountPage.css";

export default function AccountPage() {
  const { user, guardarPerfil } = useAuth();
  const [feedbackAbierto, setFeedbackAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  return (
    <main className="account-page page-container">
      <header className="page-heading">
        <h1 className="page-title">Mi cuenta</h1>
        <p className="page-description">{user ? "Tu perfil y tu colección, en un solo lugar." : "Iniciá sesión para guardar tus películas y continuar tu colección."}</p>
      </header>

      <section className="account-page__profile" aria-labelledby="account-profile-heading">
        <div className="account-page__profile-heading">
          <ProfileAvatar user={user} className="account-page__avatar" iconSize={40} />
          <div>
            <h2 id="account-profile-heading">
              {user
                ? user.nombre_visible || user.nombre_usuario || "No disponible"
                : "Tu cine, en un solo lugar"}
            </h2>
            {user?.nombre_visible && (
              <p className="account-page__handle">@{user.nombre_usuario}</p>
            )}
          </div>
        </div>

        {user && (
          <>
            {user.bio && <p className="account-page__bio">{user.bio}</p>}
            <dl className="account-page__data">
              <div><dt>Email</dt><dd>{user.email || "No disponible"}</dd></div>
            </dl>
            <button className="button" type="button" onClick={() => setPerfilAbierto(true)}>
              Editar perfil
            </button>
            {perfilAbierto && (
              <ProfileEditDialog
                user={user}
                onSave={guardarPerfil}
                onClose={() => setPerfilAbierto(false)}
              />
            )}
          </>
        )}
        <AccountSession variant="page" compact />
        {user?.email_verificado === true && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <GoogleVinculacion key={user.id} />
        )}
      </section>

      {user && (
        <section className="account-page__feedback" aria-labelledby="account-feedback-heading">
          <span className="account-page__feedback-icon"><Icon name="message" size={23} /></span>
          <div>
            <h2 id="account-feedback-heading">Muvis está en Beta</h2>
            <p>Tus ideas nos ayudan a mejorar.</p>
          </div>
          <button className="button button--feedback" type="button" onClick={() => setFeedbackAbierto(true)}>
            Dar feedback Beta
          </button>
          {feedbackAbierto && <FeedbackPanel onClose={() => setFeedbackAbierto(false)} />}
        </section>
      )}
    </main>
  );
}
