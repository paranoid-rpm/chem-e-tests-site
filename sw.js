const CACHE = "chem-e-tests-v2";

const ASSETS = [
  "./",
  "./index.html",
  "./tests.html",
  "./theory-tests.html",
  "./history-tests.html",
  "./chemistry.html",
  "./gallery.html",
  "./contact.html",
  "./manifest.webmanifest",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/prefs.js",
  "./assets/js/quiz.js",
  "./assets/js/email.js",
  "./assets/data/tests.json",
  "./assets/icons/favicon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k))))
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
