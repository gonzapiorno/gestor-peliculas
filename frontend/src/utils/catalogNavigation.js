const resultPositions = new Map();

export function catalogQuery(location) {
  if (location.pathname !== "/") return "";
  return new URLSearchParams(location.search).get("buscar")?.trim() || "";
}

export function catalogResultsUrl(query) {
  return typeof query === "string" && query.trim().length >= 2
    ? `/?buscar=${encodeURIComponent(query.trim())}` : null;
}

export function rememberResultPosition(key) {
  resultPositions.delete(key);
  resultPositions.set(key, window.scrollY);
  if (resultPositions.size > 30) resultPositions.delete(resultPositions.keys().next().value);
}

export function resultPosition(key) {
  return resultPositions.get(key);
}

export function isPlainLinkClick(event) {
  return !event.defaultPrevented && event.button === 0
    && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}
