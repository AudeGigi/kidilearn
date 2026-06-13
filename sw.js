// KidiLearn PWA — Service Worker
// Version du cache — incrémenter à chaque mise à jour
const CACHE_VERSION = 'kidilearn-v1.0';
const CACHE_NAME = CACHE_VERSION;

// Fichiers à mettre en cache pour le mode hors-ligne
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── INSTALLATION : mise en cache des ressources essentielles ──
self.addEventListener('install', event => {
  console.log('[SW] Installation du Service Worker KidiLearn');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Mise en cache des fichiers');
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => {
      // Activation immédiate sans attendre la fermeture des onglets
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATION : nettoyage des anciens caches ──
self.addEventListener('activate', event => {
  console.log('[SW] Activation du Service Worker KidiLearn');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Suppression ancien cache :', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH : stratégie Cache First, fallback réseau ──
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  // Ignorer les requêtes vers Google Fonts (réseau uniquement)
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Ressource trouvée en cache — retour immédiat
        return cachedResponse;
      }
      // Pas en cache — requête réseau
      return fetch(event.request).then(networkResponse => {
        // Mise en cache de la nouvelle ressource
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Hors ligne et pas en cache : page de fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Hors ligne', { status: 503 });
      });
    })
  );
});

// ── MESSAGE : forcer la mise à jour du cache ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
