import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import "./AuthLayout.css";

export default function AuthLayout({ children, title, description, eyebrow = "Tu historia de cine", mode = "login", navigationState, verified = false }) {
  return (
    <div className={`auth-experience auth-experience--${mode}`}>
      <header className="auth-experience__topbar">
        <Link to="/" className="auth-experience__brand" aria-label="Muvis Beta · Ir a descubrir">
          <img src="/logos/muvis-logo.svg" width="108" height="32" alt="Muvis" />
          <span className="auth-experience__beta">BETA</span>
        </Link>
        <Link to="/" className="auth-experience__explore"><Icon name="arrow-left" size={15} /><span>Explorar sin cuenta</span></Link>
      </header>

      <main className="auth-experience__panel">
        <section className="auth-experience__form-panel" aria-labelledby="auth-title">
          <header className="auth-experience__heading">
            {mode === "verify" && <p className="eyebrow"><span aria-hidden="true" />{eyebrow}</p>}
            <h1 id="auth-title" tabIndex={-1}>{title}</h1>
            {description && <p className="auth-experience__description">{description}</p>}
          </header>

          {mode !== "verify" ? <nav className="auth-experience__tabs" aria-label="Acceso a Muvis">
            <Link to="/login" state={navigationState} aria-current={mode === "login" ? "page" : undefined}>Iniciar sesión</Link>
            <Link to="/registro" state={navigationState} aria-current={mode === "register" ? "page" : undefined}>Crear cuenta</Link>
          </nav> : <ol className="auth-experience__steps" aria-label="Activación de tu cuenta">
            <li><Icon name="check" size={14} /><span>Cuenta</span></li>
            <li aria-current={!verified ? "step" : undefined}>{verified ? <Icon name="check" size={14} /> : <span className="auth-experience__step-number">2</span>}<span>Verificación</span></li>
            <li aria-current={verified ? "step" : undefined}><span className="auth-experience__step-number">3</span><span>Entrar</span></li>
          </ol>}

          {children}
        </section>

      </main>

    </div>
  );
}
