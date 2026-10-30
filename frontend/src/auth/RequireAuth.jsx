import { Navigate, useLocation } from "react-router-dom";
import PageState from "../components/ui/PageState";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { status, user, error, expired, retrySession } = useAuth();
  const location = useLocation();
  if (status === "loading") return <main className="page-container"><PageState title="Recuperando tu sesión…" description="Estamos preparando tu colección." /></main>;
  if (status === "error") return <main className="page-container"><PageState kind="error" title="No pudimos comprobar tu sesión" description={error}><button className="button" type="button" onClick={retrySession}>Reintentar sesión</button></PageState></main>;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}`, expired }} />;
  if (user?.email_verificado !== true) return <Navigate to="/verificar-email" replace state={{ email: user?.email, from: `${location.pathname}${location.search}${location.hash}` }} />;
  return children;
}
