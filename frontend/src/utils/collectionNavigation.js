import { isPlainLinkClick } from "./catalogNavigation";

const collectionViews = new Map();

export function rememberCollectionView(event, key, view) {
  if (!isPlainLinkClick(event)) return;
  const movie = event.currentTarget.closest("[data-collection-movie]");
  collectionViews.delete(key);
  collectionViews.set(key, {
    ...view,
    top: window.scrollY,
    offset: movie?.getBoundingClientRect().top,
  });
  if (collectionViews.size > 30) collectionViews.delete(collectionViews.keys().next().value);
}

export function collectionView(key, sessionKey) {
  const view = collectionViews.get(key);
  return view?.sessionKey === sessionKey ? view : undefined;
}

export function restoreCollectionPosition(view, container) {
  const movie = container?.querySelector(`[data-collection-movie="${view.movieId}"]`);
  const top = movie && view.offset !== undefined
    ? window.scrollY + movie.getBoundingClientRect().top - view.offset
    : view.top;
  window.scrollTo({ top, left: 0, behavior: "instant" });
}
