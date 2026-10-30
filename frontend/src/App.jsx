import {
  BrowserRouter,
  Route,
  Routes
} from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";

import AppLayout from "./components/layout/AppLayout";
import Footer from "./components/layout/Footer";

import DiscoverPage from "./pages/DiscoverPage";
import CollectionPage from "./pages/CollectionPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import CollectionMovieDetailPage from "./pages/CollectionMovieDetailPage";
import AuthPage from "./pages/AuthPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import RequireAuth from "./auth/RequireAuth";
import AccountPage from "./pages/AccountPage";
import CommunityPage from "./pages/CommunityPage";

function RouteScroll() {
  const { pathname } = useLocation();
  const authRoute = /^\/(login|registro|verificar-email)\/?$/.test(pathname);
  useLayoutEffect(() => { if (authRoute) window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname, authRoute]);
  useEffect(() => { if (!authRoute) window.scrollTo(0, 0); }, [pathname, authRoute]);
  return null;
}

function AppContent() {
  const { sessionKey } = useAuth();
  return (
    <BrowserRouter>
      <RouteScroll />
      <AppLayout>

        {/* El contenido ocupa todo el espacio disponible */}
        <div className="app-content" id="contenido" tabIndex={-1} key={sessionKey}>
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
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/comunidad" element={<CommunityPage />} />
          </Routes>
        </div>

        <Footer />

      </AppLayout>
    </BrowserRouter>
  );
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
