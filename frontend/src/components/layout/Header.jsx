import { NavLink, useMatch } from "react-router-dom";

import "./Header.css";


function Header() {
  const enDetalle = Boolean(useMatch("/pelicula/:id"));
  return (
    <header className="header">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <div className="header__inner">
      <NavLink to="/" className="header__brand" aria-label="Muvis · Ir a descubrir">
        <img src="/logos/muvis-logo.svg" alt="Muvis" width="112" height="33" />
      </NavLink>

      <nav className="header__nav" aria-label="Navegación principal">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `header__link${isActive || enDetalle ? " active" : ""}`}
        >
          Descubrir
        </NavLink>

        <NavLink
          to="/coleccion"
          className="header__link"
        >
          Mi colección
        </NavLink>
      </nav>
      <span className="header__tagline">Un lugar para tu mirada.</span>
      </div>
    </header>
  );
}

export default Header;
