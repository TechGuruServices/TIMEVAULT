/**
* TimeVault Service Worker
* Provides offline support, caching, and background sync
* @version 2.0.0
*/

const CACHE_NAME = 'timevault-v8';
const STATIC_CACHE = 'timevault-static-v8';
const DYNAMIC_CACHE = 'timevault-dynamic-v8';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    './',
    'index.html',
    'styles.css',
    'app.js',
    'manifest.json',
    'logo.png',
    'favicon.ico',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png'
];

// External assets (cache with network-first strategy)
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============================================
// FETCH EVENT
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Chrome extensions and browser internals
    if (url.protocol === 'chrome-extension:' || url.protocol === 'chrome:') {
        return;
    }

    // Handle different request types
    if (isStaticAsset(url)) {
        // Cache-first for static assets
        event.respondWith(cacheFirst(request));
    } else if (isExternalAsset(url)) {
        // Network-first with cache fallback for external resources
        event.respondWith(networkFirst(request));
    } else if (request.mode === 'navigate') {
        // Network-first for navigation requests (HTML pages)
        event.respondWith(networkFirstWithOfflineFallback(request));
    } else {
        // Stale-while-revalidate for everything else
        event.respondWith(staleWhileRevalidate(request));
    }
});

// ============================================
// CACHING STRATEGIES
// ============================================

/**
 * Cache-first strategy: Check cache, fallback to network
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Cache-first fetch failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy: Try network, fallback to cache
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        console.error('[SW] Network-first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first with offline HTML fallback for navigation
 */
async function networkFirstWithOfflineFallback(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Try to return cached page
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        // Try to return cached index.html for SPA routing
        const indexCached = await caches.match('index.html');
        if (indexCached) {
            return indexCached;
        }

        // Return offline page
        return new Response(getOfflineHTML(), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

/**
 * Stale-while-revalidate: Return cached immediately, update in background
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    return cached || fetchPromise;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isStaticAsset(url) {
    const staticExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
    return url.origin === self.location.origin &&
        staticExtensions.some(ext => url.pathname.endsWith(ext));
}

function isExternalAsset(url) {
    return EXTERNAL_ASSETS.some(asset => url.href.startsWith(asset.split('?')[0]));
}

function getOfflineHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TimeVault - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #050507;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
    }
    .logo-offline {
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      filter: drop-shadow(0 0 15px rgba(212, 175, 55, 0.3));
    }
    h1 {
      font-size: 24px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #d4af37, #f4e4bc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 24px;
      max-width: 400px;
      line-height: 1.6;
    }
    button {
      background: linear-gradient(135deg, #d4af37, #b8960c);
      color: #050507;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
    }
  </style>
</head>
<body>
  <img src="logo.png" alt="TimeVault" class="logo-offline">
  <h1>You're Offline</h1>
  <p>TimeVault couldn't connect to the network. Your data is saved locally and will sync when you're back online.</p>
  <button onclick="location.reload()">Try Again</button>
</body>
</html>
  `;
}

// ============================================
// BACKGROUND SYNC
// ============================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'syncData') {
        event.waitUntil(syncPendingData());
    }
});

async function syncPendingData() {
    // This would sync with a backend when one is available
    console.log('[SW] Syncing pending data...');
    // Future implementation: Read from IndexedDB and push to server
}

// ============================================
// PUSH NOTIFICATIONS (optional future feature)
// ============================================
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'TimeVault notification',
        icon: 'icons/icon-192x192.png',
        badge: 'icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: data.url || 'index.html'
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'TimeVault', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || 'index.html')
    );
});

// ============================================
// MESSAGE HANDLER (for skipWaiting requests)
// ============================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service worker loaded');
