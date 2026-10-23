import {
  BrowserRouter,
  Route,
  Routes
} from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

import DiscoverPage from "./pages/DiscoverPage";
import CollectionPage from "./pages/CollectionPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import CollectionMovieDetailPage from "./pages/CollectionMovieDetailPage";
import AuthPage from "./pages/AuthPage";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import RequireAuth from "./auth/RequireAuth";

function RouteScroll() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AppContent() {
  const { sessionKey } = useAuth();
  return (
    <BrowserRouter>
      <RouteScroll />
      <div className="app-shell">

        <Header />

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
          </Routes>
        </div>

        <Footer />

      </div>
    </BrowserRouter>
  );
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
