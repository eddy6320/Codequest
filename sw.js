/* Service worker: la app funciona sin conexión (stale-while-revalidate). Sube V al publicar cambios grandes. */
const V = 'cq-v1';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'roadmap.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
  'content/helpers.js', 'content/python.js', 'content/javascript.js', 'content/html.js',
  'content/sql.js', 'content/java.js', 'content/c.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
