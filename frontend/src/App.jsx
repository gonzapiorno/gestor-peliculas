import {
  BrowserRouter,
  Route,
  Routes
} from "react-router-dom";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

import DiscoverPage from "./pages/DiscoverPage";
import CollectionPage from "./pages/CollectionPage";
import MovieDetailPage from "./pages/MovieDetailPage";


function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">

        <Header />

        {/* El contenido ocupa todo el espacio disponible */}
        <div className="app-content">
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