import { Link, useNavigate } from "react-router-dom";
import { isPlainLinkClick } from "../../utils/catalogNavigation";
import Icon from "../ui/Icon";
import "./MovieDetailBackLink.css";

export default function MovieDetailBackLink({ to, historyBack, children }) {
  const navigate = useNavigate();

  function handleClick(event) {
    if (!historyBack || !isPlainLinkClick(event)) return;
    event.preventDefault();
    navigate(-1);
  }

  return (
    <nav className="movie-detail-back" aria-label="Volver">
      <Link className="button button--primary movie-detail-back__link" to={to} onClick={handleClick}>
        <Icon name="arrow-left" size={16} />
        {children}
      </Link>
    </nav>
  );
}
