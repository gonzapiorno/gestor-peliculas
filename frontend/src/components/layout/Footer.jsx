import { useLocation } from "react-router-dom";
import "./Footer.css";

function Attribution() {
  return <p>Datos de películas: <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>. Las notas personales son tuyas.<br /><span>Este producto utiliza la API de TMDB, pero TMDB no lo respalda ni certifica.</span></p>;
}

function Footer() {
  const { pathname } = useLocation();
  if (["/login", "/registro", "/verificar-email"].includes(pathname.replace(/\/+$/, ""))) return null;
  const compact = pathname === "/comunidad" || pathname === "/cuenta";
  return (
    <footer className={compact ? "footer footer--compact" : "footer"}>
      {compact ? (
        <details className="footer__details" key={pathname}>
          <summary>Muvis · Información de TMDB</summary>
          <Attribution />
        </details>
      ) : (
        <div className="footer__inner">
          <span><span className="footer__brand">Muvis</span> · Un lugar para tu mirada.</span>
          <Attribution />
        </div>
      )}
    </footer>
  );
}

export default Footer;
