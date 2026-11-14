const resultPositions = new Map();

export const catalogCategories = {
  populares: "Populares",
  thriller: "Thriller",
  drama: "Drama",
  romance: "Romance",
};

export const catalogDecades = Array.from({ length: 13 }, (_, index) => 2020 - index * 10);

export function catalogCategoryUrl(category, decade) {
  const params = new URLSearchParams({ categoria: category });
  if (catalogDecades.includes(decade)) params.set("decada", decade);
  return `/?${params}`;
}

export function catalogDecade(location) {
  const decade = Number(new URLSearchParams(location.search).get("decada"));
  return catalogDecades.includes(decade) ? decade : null;
}

export function catalogCategory(location) {
  if (location.pathname !== "/") return null;
  const category = new URLSearchParams(location.search).get("categoria");
  return Object.hasOwn(catalogCategories, category) ? category : null;
}

export function catalogQuery(location) {
  if (location.pathname !== "/") return "";
  return new URLSearchParams(location.search).get("buscar")?.trim() || "";
}

export function catalogResultsUrl(query) {
  return typeof query === "string" && query.trim().length >= 2
    ? `/?buscar=${encodeURIComponent(query.trim())}` : null;
}

export function rememberResultPosition(key) {
  const carousels = Array.from(document.querySelectorAll("[data-catalog-carousel]"),
    ({ id, scrollLeft }) => [id, scrollLeft]);
  resultPositions.delete(key);
  resultPositions.set(key, { top: window.scrollY, carousels });
  if (resultPositions.size > 30) resultPositions.delete(resultPositions.keys().next().value);
}

export function resultPosition(key) {
  return resultPositions.get(key);
}

export function isPlainLinkClick(event) {
  return !event.defaultPrevented && event.button === 0
    && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}
