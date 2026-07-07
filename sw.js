// srw4edit PWA service worker — オフライン対応
// index.html はネット優先（更新が届く）、それ以外（wheel / Pyodide CDN / PyPI）はキャッシュ優先
const CACHE = 'srw4edit-v0.7.1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './srw4edit-0.7.1-py3-none-any.whl',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isAppShell = url.origin === location.origin
    && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));

  if (isAppShell) {
    // ネット優先 → 失敗時キャッシュ（オフライン起動）
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
  } else {
    // キャッシュ優先（wheel / pyodide CDN / pypi のwheel群は不変なので一度取れば永続）
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
