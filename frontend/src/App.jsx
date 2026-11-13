import {
  BrowserRouter,
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
import { resultPosition } from "./utils/catalogNavigation";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import RequireAuth from "./auth/RequireAuth";
import AccountPage from "./pages/AccountPage";
import CommunityPage from "./pages/CommunityPage";

function RouteScroll() {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();
  const authRoute = isAuthRoute(pathname);
  const returningToResults = pathname === "/" && navigationType === "POP" && resultPosition(key) !== undefined;
  useLayoutEffect(() => { if (authRoute) window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname, authRoute]);
  useEffect(() => { if (!authRoute && !returningToResults) window.scrollTo(0, 0); }, [pathname, authRoute, returningToResults]);
  return null;
}

function AppContent() {
  const { sessionKey } = useAuth();
  // El formulario del enlace conserva su token en memoria al actualizar la sesión.
  const contentKey = useMatch("/restablecer-password") ? "password-reset" : sessionKey;
  return (
    <>
      <RouteScroll />
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
