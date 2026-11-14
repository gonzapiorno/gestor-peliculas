const collectionViews = new Map();

export function rememberCollectionView(key, view) {
  collectionViews.delete(key);
  collectionViews.set(key, view);
  if (collectionViews.size > 30) collectionViews.delete(collectionViews.keys().next().value);
}

export function collectionView(key, sessionKey) {
  const view = collectionViews.get(key);
  return view?.sessionKey === sessionKey ? view : undefined;
}
