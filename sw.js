// aesthe service worker: keeps map tiles, fonts, icons and the app itself so it works on weak or no internet.
const C = 'aesthe-v1', MAX = 4000;
const HOSTS = ['tiles.openfreemap.org', 'unpkg.com'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function trim(c) {
  const k = await c.keys();
  if (k.length > MAX) await Promise.all(k.slice(0, 300).map(r => c.delete(r)));
}

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;

  // Map data + library: answer from the saved copy instantly, refresh it quietly in the background.
  if (HOSTS.includes(u.hostname)) {
    e.respondWith(caches.open(C).then(async c => {
      const hit = await c.match(r);
      const fresh = fetch(r).then(res => {
        if (res.ok || res.type === 'opaque') { c.put(r, res.clone()); trim(c); }
        return res;
      }).catch(() => hit || Response.error());
      return hit || fresh;
    }));
    return;
  }

  // The app itself: use the internet when it works, the saved copy when it does not.
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || Response.error())));
  }
  // Search, places and directions servers are not cached: their answers must be fresh.
});
