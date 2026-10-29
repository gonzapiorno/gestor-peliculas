import { useEffect, useRef, useState } from "react";
import { NavLink, useMatch } from "react-router-dom";

import FeedbackPanel from "../ui/FeedbackPanel";
import Icon from "../ui/Icon";
import Header from "./Header";
import "./AppLayout.css";

function NavigationLink({ to, icon, children, soon = false, active = false, mobile = false, end = false }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `${mobile ? "bottom-nav__link" : "sidebar__link"}${isActive || active ? " is-active" : ""}`}>
      <span className={mobile ? "bottom-nav__icon" : "sidebar__icon"}><Icon name={icon} size={21} /></span>
      <span>{children}</span>
      {soon && <span className={mobile ? "bottom-nav__soon" : "sidebar__soon"}>{mobile ? "Pronto" : "Próximamente"}</span>}
    </NavLink>
  );
}

export default function AppLayout({ children }) {
  const [feedbackAbierto, setFeedbackAbierto] = useState(false);
  const layoutRef = useRef(null);
  const bottomNavRef = useRef(null);

  useEffect(() => {
    const navigation = bottomNavRef.current;
    const layout = layoutRef.current;
    if (!navigation || !layout) return;
    function reserveNavigationSpace() {
      layout.style.setProperty("--bottom-nav-height", `${Math.ceil(navigation.getBoundingClientRect().height)}px`);
    }
    reserveNavigationSpace();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reserveNavigationSpace) : null;
    observer?.observe(navigation);
    window.addEventListener("resize", reserveNavigationSpace);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reserveNavigationSpace);
    };
  }, []);
  const enDetalleCatalogo = Boolean(useMatch("/pelicula/:id"));
  const enLogin = Boolean(useMatch("/login"));
  const enRegistro = Boolean(useMatch("/registro"));

  return (
    <div className="app-layout" ref={layoutRef}>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <aside className="sidebar" aria-label="Navegación de Muvis">
        <NavLink to="/" className="sidebar__brand" aria-label="Muvis Beta · Ir a descubrir">
          <img src="/logos/muvis-logo.svg" alt="Muvis" width="112" height="33" /><span className="beta-badge">BETA</span>
        </NavLink>
        <nav className="sidebar__navigation" aria-label="Navegación principal">
          <div className="sidebar__group">
            <p className="sidebar__label">Cinemateca</p>
            <NavigationLink to="/" icon="compass" end active={enDetalleCatalogo}>Descubrir</NavigationLink>
            <NavigationLink to="/coleccion" icon="library">Mi colección</NavigationLink>
            <NavigationLink to="/comunidad" icon="users" soon>Comunidad</NavigationLink>
          </div>
          <div className="sidebar__group">
            <p className="sidebar__label">Tu espacio</p>
            <NavigationLink to="/cuenta" icon="user" active={enLogin || enRegistro}>Mi cuenta</NavigationLink>
          </div>
        </nav>
        <button className="sidebar__feedback" type="button" onClick={() => setFeedbackAbierto(true)}><Icon name="message" size={19} /><span>Dar feedback Beta</span></button>
      </aside>

      <div className="app-layout__main">
        <Header />
        <div className="app-layout__content">{children}</div>
      </div>

      <nav className="bottom-nav" ref={bottomNavRef} aria-label="Navegación principal móvil">
        <NavigationLink to="/" icon="compass" end mobile active={enDetalleCatalogo}>Descubrir</NavigationLink>
        <NavigationLink to="/coleccion" icon="library" mobile>Mi colección</NavigationLink>
        <NavigationLink to="/comunidad" icon="users" mobile soon>Comunidad</NavigationLink>
        <NavigationLink to="/cuenta" icon="user" mobile active={enLogin || enRegistro}>Cuenta</NavigationLink>
      </nav>

      {feedbackAbierto && <FeedbackPanel onClose={() => setFeedbackAbierto(false)} />}
    </div>
  );
}
