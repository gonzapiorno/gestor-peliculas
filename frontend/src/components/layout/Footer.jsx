import "./Footer.css";


function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <span><span className="footer__brand">Muvis</span> · Un lugar para tu mirada.</span>
        <p>Datos de películas: <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>. Las notas personales son tuyas.<br /><span>Este producto utiliza la API de TMDB, pero TMDB no lo respalda ni certifica.</span></p>
      </div>
    </footer>
  );
}

export default Footer;
