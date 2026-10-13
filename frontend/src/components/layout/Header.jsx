import { NavLink } from "react-router-dom";

import "./Header.css";


function Header() {
  return (
    <header className="header">

      <h1 className="header__brand">
        Muvis
      </h1>

      <nav className="header__nav">
        <NavLink
          to="/"
          className="header__link"
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

    </header>
  );
}

export default Header;