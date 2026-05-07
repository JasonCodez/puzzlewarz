const CACHE_NAME = "puzzlewarz-static-v1";
const CACHEABLE_PATHS = [
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  "/pwa/screenshot-home-wide.png",
  "/pwa/screenshot-home-narrow.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHEABLE_PATHS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!CACHEABLE_PATHS.includes(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      const networkResponsePromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);

      if (cachedResponse) {
        event.waitUntil(networkResponsePromise);
        return cachedResponse;
      }

      const networkResponse = await networkResponsePromise;
      return networkResponse || Response.error();
    })()
  );
});