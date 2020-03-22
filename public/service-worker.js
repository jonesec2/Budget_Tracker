const FILES_TO_CACHE = [
   "/",
   "/index.html",
   "/styles.css",
   "/index.js",
   "/db.js",
   "/manifest.webmanifest",
   "/icons/icon-192x192.png",
   "/icons/icon-512x512.png",
   "https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css",
   "https://cdn.jsdelivr.net/npm/chart.js@2.8.0"

];

const CACHE_NAME = "static-cache-v1";
const DATA_CACHE_NAME = "data-cache-v1";

self.addEventListener("install", event => {
   event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
         console.log("Your files were pre-cached successfully!");
         return cache.addAll(FILES_TO_CACHE);
      })
   );

   self.skipWaiting();
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener("activate", event => {
   const currentCaches = [CACHE_NAME, DATA_CACHE_NAME];
   event.waitUntil(
      caches
         .keys()
         .then(cacheNames => {
            // return array of cache names that are old to delete
            return cacheNames.filter(
               cacheName => !currentCaches.includes(cacheName)
            );
         })
         .then(cachesToDelete => {
            return Promise.all(
               cachesToDelete.map(cacheToDelete => {
                  return caches.delete(cacheToDelete);
               })
            );
         })
         .then(() => self.clients.claim())
   );
});

self.addEventListener("fetch", event => {
   // non GET requests are not cached and requests to other origins are not cached
   if (
      event.request.method !== "GET" ||
      !event.request.url.startsWith(self.location.origin)
   ) {
      event.respondWith(fetch(event.request));
      return;
   }

   // handle runtime GET requests for data from /api routes
   if (event.request.url.includes("/api/")) {
      // make network request and fallback to cache if network request fails (offline)
      event.respondWith(
         caches.open(DATA_CACHE_NAME).then(cache => {
            return fetch(event.request)
               .then(response => {
                  // If the response was good, clone it and store it in the cache.
                  if (response.status === 200) {
                     cache.put(event.request.url, response.clone());
                  }

                  return response;
               })
               .catch(err => {
                  // Network request failed, try to get it from the cache.
                  return cache.match(event.request);
               });
         }).catch(err => console.log(err))
      );

      return;
   }

   // use cache first for all other requests for performance
   event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
});
