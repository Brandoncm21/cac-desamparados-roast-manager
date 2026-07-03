if (self.location.hostname === "localhost") {
  self.addEventListener("fetch", () => {});
} else {
  const CACHE_NAME = "scacr-v1";
  const STATIC_ASSETS = [
    "/",
    "/login",
    "/manifest.json",
  ];

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise.catch(() => cached || new Response("Offline", { status: 503 }));
      })
    );
  });
}
