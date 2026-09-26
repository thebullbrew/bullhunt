/* BullHunt service worker: offline app shell + tile packs */
const VERSION = "bullhunt-v1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "css/app.css",
  "js/vendor/maplibre-gl.js", "js/vendor/maplibre-gl.css",
  "js/util.js", "js/store.js", "js/map.js", "js/offline.js",
  "js/compass.js", "js/weather.js", "js/hunt.js", "js/waypoints.js", "js/app.js",
  "data/sgl.min.geojson", "data/wmu.min.geojson", "data/sgl_parking.min.geojson",
  "icons/icon-192.png", "icons/icon-512.png"
];
const TILE_CACHE = "bullhunt-tiles";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION && k !== TILE_CACHE).map(k => caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

const TILE_HOSTS = ["server.arcgisonline.com", "basemaps.cartocdn.com", "tile.openstreetmap.org"];

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // tiles: cache-first (packs downloaded ahead + on-demand)
  if (TILE_HOSTS.some(h => url.hostname.endsWith(h))) {
    e.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(e.request).then(hit => {
          if (hit) return hit;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(()=> hit);
        })
      )
    );
    return;
  }

  // app shell: cache-first, then network
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        // offline fallback for navigations
        if (e.request.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
