/**
 * TimeVault Service Worker
 * Provides offline functionality and caching for the PWA
 */

const CACHE_NAME = 'timevault-v2.0';
const OFFLINE_URL = 'index.html';

const CACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './apps.js',
  './manifest.json',
  './icons/time-icons_favicon_96x96.png',
  './icons/time-icons_favicon_64x64.png',
  './icons/time-icons_favicon_48x48.png',
  './icons/time-icons_favicon_32x32.png',
  './icons/time-icons_favicon_16x16.png',
  './icons/time-icons_favicon.ico',
  './icons/time-icons_android_192x192.png',
  './icons/time-icons_android_512x512.png',
  './icons/time-icons_apple_180x180.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js',
  'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('TimeVault SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('TimeVault SW: Caching assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('TimeVault SW: Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('TimeVault SW: Install failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('TimeVault SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('TimeVault SW: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('TimeVault SW: Now active, controlling clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Network-first strategy for external resources
  if (!event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first strategy for local assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version but update in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => { });
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          // Cache the new response
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        });
      })
      .catch((error) => {
        console.error('TimeVault SW: Fetch failed', error);
        // If both cache and network fail, return offline page for HTML
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match(OFFLINE_URL);
        }
        // For other resources, return a basic error response
        return new Response('Network error', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Background sync for data persistence
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-time-entries') {
    console.log('TimeVault SW: Background sync triggered');
    // Future: Implement server sync here
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  if (event.data) {
    let data;
    try {
      // Try to parse as JSON
      data = event.data.json();
    } catch (e) {
      // If not JSON, use text content
      console.log('TimeVault SW: Push data is not JSON, using text');
      data = {
        title: 'TimeVault',
        body: event.data.text() || 'Time to check your TimeVault!'
      };
    }

    const options = {
      body: data.body || 'Time to check your TimeVault!',
      icon: './icons/time-icons_android_192x192.png',
      badge: './icons/time-icons_favicon_96x96.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || './'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'TimeVault', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || './');
      }
    })
  );
});

console.log('TimeVault Service Worker loaded');
