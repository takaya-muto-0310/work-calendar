const CACHE = 'work-cal-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Noto+Sans+JP:wght@300;400;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || (req.method === 'GET' && accept.includes('text/html'));

  if (isHTML) {
    // 画面（HTML）はネットワーク優先 → 更新を自動反映。オフライン時はキャッシュを使う。
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // フォント・画像などはキャッシュ優先（表示が速い・通信節約）
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
