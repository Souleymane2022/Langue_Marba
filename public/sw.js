/* Service worker : rend l'application utilisable hors-ligne
 * (dictionnaire, leçons, quiz, proverbes). L'assistant IA nécessite Internet. */
const CACHE = "vun-marbana-v1";
const CORE = ["/", "/dictionnaire", "/apprendre", "/secteurs", "/traduire", "/proverbes", "/alphabet", "/progres", "/contribuer",
  "/data/dictionary.json", "/data/proverbs.json", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Données et ressources statiques : cache d'abord, mise à jour en arrière-plan.
  if (url.pathname.startsWith("/data/") || url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".svg")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Pages : réseau d'abord, cache en secours (hors-ligne).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")) || Response.error()),
    );
  }
});
