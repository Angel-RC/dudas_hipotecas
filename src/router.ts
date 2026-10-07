export function getRoute(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

export function navigate(id: string): void {
  window.location.hash = `#/${id}`;
}

export function replaceRoute(id: string): void {
  window.history.replaceState(null, '', `#/${id}`);
}

export function onRouteChange(callback: (id: string) => void): () => void {
  const handler = () => callback(getRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
