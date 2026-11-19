import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigationType,
} from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";

import AppLayout from "./components/layout/AppLayout";
import Footer from "./components/layout/Footer";

import DiscoverPage from "./pages/DiscoverPage";
import CollectionPage from "./pages/CollectionPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import CollectionMovieDetailPage from "./pages/CollectionMovieDetailPage";
import AuthPage from "./pages/AuthPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import RecoverPasswordPage from "./pages/RecoverPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { isAuthRoute } from "./utils/authFlow";
import { catalogCategory, catalogDecade, resultPosition } from "./utils/catalogNavigation";
import { collectionView } from "./utils/collectionNavigation";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import RequireAuth from "./auth/RequireAuth";
import AccountPage from "./pages/AccountPage";
import CommunityPage from "./pages/CommunityPage";
import FriendProfilePage from "./pages/FriendProfilePage";

function RouteScroll({ sessionKey }) {
  const location = useLocation();
  const { pathname, key } = location;
  const navigationType = useNavigationType();
  const friendProfile = useMatch("/comunidad/amigos/:id");
  const authRoute = isAuthRoute(pathname);
  const category = catalogCategory(location);
  const decade = category ? catalogDecade(location) : null;
  const returningToList = navigationType === "POP" && (
    (pathname === "/" && resultPosition(key) !== undefined)
    || ((pathname === "/coleccion" || friendProfile) && collectionView(key, sessionKey) !== undefined)
  );
  useLayoutEffect(() => { if (authRoute) window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname, authRoute]);
  useEffect(() => { if (!authRoute && !returningToList) window.scrollTo(0, 0); }, [pathname, authRoute, category, decade, returningToList]);
  return null;
}

function RouteTitle() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const titles = {
      "/": "Descubrir", "/coleccion": "Mi colección", "/cuenta": "Mi cuenta",
      "/comunidad": "Comunidad", "/login": "Iniciar sesión", "/registro": "Crear cuenta",
      "/verificar-email": "Verificar correo", "/recuperar-password": "Recuperar contraseña",
      "/restablecer-password": "Restablecer contraseña",
    };
    const title = titles[pathname] || (/^\/comunidad\/amigos\//.test(pathname) ? "Perfil de amigo"
      : /^\/(pelicula|coleccion)\//.test(pathname) ? "Detalle de película" : "Página no encontrada");
    document.title = `${title} · Muvis`;
  }, [pathname]);
  return null;
}

function NotFoundPage() {
  return <main className="page-container">
    <h1 className="page-title">Página no encontrada</h1>
    <p className="page-description">Esta dirección no está disponible. Podés seguir explorando películas en Descubrir.</p>
    <Link className="button button--primary" to="/">Volver a descubrir</Link>
  </main>;
}

function AppContent() {
  const { sessionKey } = useAuth();
  // El formulario del enlace conserva su token en memoria al actualizar la sesión.
  const contentKey = useMatch("/restablecer-password") ? "password-reset" : sessionKey;
  return (
    <>
      <RouteScroll sessionKey={sessionKey} />
      <RouteTitle />
      <AppLayout>

        {/* El contenido ocupa todo el espacio disponible */}
        <div className="app-content" id="contenido" tabIndex={-1} key={contentKey}>
          <Routes>
            <Route
              path="/"
              element={<DiscoverPage />}
            />

            <Route
              path="/coleccion"
              element={<RequireAuth><CollectionPage /></RequireAuth>}
            />

            <Route
              path="/coleccion/:id"
              element={<RequireAuth><CollectionMovieDetailPage /></RequireAuth>}
            />

            <Route
              path="/pelicula/:id"
              element={<MovieDetailPage />}
            />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/registro" element={<AuthPage mode="register" />} />
            <Route path="/verificar-email" element={<VerifyEmailPage />} />
            <Route path="/recuperar-password" element={<RecoverPasswordPage />} />
            <Route path="/restablecer-password" element={<ResetPasswordPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/comunidad" element={<RequireAuth><CommunityPage /></RequireAuth>} />
            <Route path="/comunidad/amigos/:id" element={<RequireAuth><FriendProfilePage /></RequireAuth>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>

        <Footer />

      </AppLayout>
    </>
  );
}

function App() {
  return <AuthProvider><BrowserRouter><AppContent /></BrowserRouter></AuthProvider>;
}

export default App;
