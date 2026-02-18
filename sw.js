const CACHE = "chem-e-tests-v11";

const ASSETS = [
  "./",
  "./index.html",
  "./tests.html",
  "./theory-tests.html",
  "./history-tests.html",
  "./chemistry.html",
  "./glossary.html",
  "./contact.html",
  "./manifest.webmanifest",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/prefs.js",
  "./assets/js/quiz.js",
  "./assets/js/questionBank.js",
  "./assets/js/email.js",
  "./assets/data/tests.json",
  "./assets/icons/favicon.svg",
  "./assets/img/header-wave-light.svg",
  "./assets/img/header-wave-dark.svg",
  "./assets/img/ink-bg-a-light.svg",
  "./assets/img/ink-bg-a-dark.svg",
  "./assets/img/ink-bg-b-light.svg",
  "./assets/img/ink-bg-b-dark.svg",
  "./assets/img/ink-bg-c-light.svg",
  "./assets/img/ink-bg-c-dark.svg",
  "./assets/img/illus/index.svg",
  "./assets/img/illus/tests.svg",
  "./assets/img/illus/theory.svg",
  "./assets/img/illus/history.svg",
  "./assets/img/illus/chemistry.svg",
  "./assets/img/illus/glossary.svg",
  "./assets/img/illus/contact.svg"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))))),
      self.clients.claim()
    ])
  );
});

async function networkFirst(request){
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return cache.match("./index.html");
    throw new Error("offline");
  }
}

async function staleWhileRevalidate(request){
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || fetch(request);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req));
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(staleWhileRevalidate(req));
});
