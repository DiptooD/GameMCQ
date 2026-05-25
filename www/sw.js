const CACHE_NAME = 'gamemcq-cache-v1';

// Install event - activate immediately
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - "Stale While Revalidate" / "Cache First" Hybrid
// This automatically caches assets as the user plays online.
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                // Check if valid response
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(err => {
                // If network fails, the catch resolves to nothing, 
                // falling back cleanly to the cachedResponse below.
                console.log('Network failed, relying on cache for:', event.request.url);
            });

            // Return cached response immediately if we have it, else wait for network
            return cachedResponse || fetchPromise;
        })
    );
});

// Background Sync Event
self.addEventListener('sync', event => {
    if (event.tag === 'sync-game-data') {
        event.waitUntil(syncGameData());
    }
});

async function syncGameData() {
    console.log('Background Sync Triggered: Attempting to upload local data to server...');
    // Replace this section with your actual API endpoint if you have a backend
    /*
    const profileData = // fetch from IndexedDB...
    await fetch('https://your-api.com/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
    });
    */
    console.log('Sync Complete.');
}