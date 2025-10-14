// Karkard Service Worker for Offline Capability

const CACHE_NAME = 'karkard-cache-v1';

// On install, cache the core application shell files.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      // We don't pre-cache external resources to avoid installation failure.
      // They will be cached on the first fetch.
      return cache.addAll([
        '/',
        '/index.html',
      ]);
    })
  );
});

// On activate, remove any old caches to prevent conflicts.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// On fetch, implement a cache-first, then network strategy.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For API calls to Google, always go to the network and do not cache.
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    // Do not respond from cache, let the browser handle it.
    return; 
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // If we have a response in the cache, return it immediately.
      if (cachedResponse) {
        return cachedResponse;
      }

      // If it's not in the cache, fetch it from the network.
      return fetch(event.request).then(networkResponse => {
        // A response is a stream and can only be consumed once.
        // We need to clone it to put one copy in cache and return the other to the browser.
        const responseToCache = networkResponse.clone();

        // Only cache successful responses.
        if (networkResponse.ok) {
           caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
           });
        }
        
        return networkResponse;
      }).catch(error => {
        // This catch handles network errors, which occur when offline.
        console.error('Service Worker: Fetch failed; user may be offline.', error);
        // Here you could return a custom offline fallback page if one was cached.
        // For this app, the cached assets should be enough.
      });
    })
  );
});