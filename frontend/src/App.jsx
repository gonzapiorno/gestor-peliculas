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

function RouteScroll() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RouteScroll />
      <div className="app-shell">

        <Header />

        {/* El contenido ocupa todo el espacio disponible */}
        <div className="app-content" id="contenido" tabIndex={-1}>
          <Routes>
            <Route
              path="/"
              element={<DiscoverPage />}
            />

            <Route
              path="/coleccion"
              element={<CollectionPage />}
            />

            <Route
              path="/coleccion/:id"
              element={<CollectionMovieDetailPage />}
            />

            <Route
              path="/pelicula/:id"
              element={<MovieDetailPage />}
            />
          </Routes>
        </div>

        <Footer />

      </div>
    </BrowserRouter>
  );
}

export default App;
