import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { AccountSession } from "../components/layout/Header";
import FeedbackPanel from "../components/ui/FeedbackPanel";
import Icon from "../components/ui/Icon";
import "./AccountPage.css";

export default function AccountPage() {
  const { user } = useAuth();
  const [feedbackAbierto, setFeedbackAbierto] = useState(false);

  return (
    <main className="account-page page-container">
      <header className="page-heading">
        <h1 className="page-title">Mi cuenta</h1>
        <p className="page-description">{user ? "Tu perfil y tu colección, en un solo lugar." : "Iniciá sesión para guardar tus películas y continuar tu colección."}</p>
      </header>

      <section className="account-page__profile" aria-labelledby="account-profile-heading">
        <div className="account-page__profile-heading"><span className="account-page__avatar"><Icon name="user" size={28} /></span><h2 id="account-profile-heading">{user ? <><span className="visually-hidden">Nombre de usuario: </span>{user.nombre_usuario || "No disponible"}</> : "Tu cine, en un solo lugar"}</h2></div>
        {user && (
          <dl className="account-page__data">
            <div><dt>Email</dt><dd>{user.email || "No disponible"}</dd></div>
          </dl>
        )}
        <AccountSession variant="page" compact />
      </section>

      <section className="account-page__feedback" aria-labelledby="account-feedback-heading">
        <span className="account-page__feedback-icon"><Icon name="message" size={23} /></span>
        <div><h2 id="account-feedback-heading">Muvis está en Beta</h2><p>Tus ideas nos ayudan a mejorar. El envío estará disponible pronto.</p></div>
        <button className="button" type="button" onClick={() => setFeedbackAbierto(true)}>Dar feedback Beta</button>
      </section>
      {feedbackAbierto && <FeedbackPanel onClose={() => setFeedbackAbierto(false)} />}
    </main>
  );
}
