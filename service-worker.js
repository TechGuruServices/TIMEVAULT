/**
 * TimeVault Service Worker
 * Hardened for deterministic offline behavior and safe cache management.
 * @version 2.1.0
 */

const CACHE_VERSION = 'v10';
const STATIC_CACHE = `timevault-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `timevault-dynamic-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
    './',
    'index.html',
    'styles.css',
    'app.js',
    'manifest.json',
    'logo.png',
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon-48x48.png',
    'favicon-96x96.png',
    'apple-touch-icon-180x180.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png'
];

// External requirements
const EXTERNAL_FONTS = 'https://fonts.googleapis.com';
const FONT_AWESOME = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome';

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch(() => { })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('timevault-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                        .map((name) => caches.delete(name))
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

    // Skip non-GET requests and internal protocols
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:' || url.protocol === 'chrome:') {
        return;
    }

    // Navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(request));
        return;
    }

    // Static assets (Local or known external)
    if (isStaticAsset(url) || url.origin === EXTERNAL_FONTS || url.href.includes(FONT_AWESOME)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Default: Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// ============================================
// STRATEGIES
// ============================================

async function handleNavigation(request) {
    try {
        // Try network first
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
            return response;
        }
    } catch (error) {
        // Network failed, try cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // Fallback to cached index.html for SPA-like behavior
        const index = await caches.match('index.html');
        if (index) return index;
    }

    // Absolute fallback
    return new Response(getOfflineHTML(), {
        headers: { 'Content-Type': 'text/html' }
    });
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response('Offline resource unavailable', { status: 503 });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);

    return cached || fetchPromise;
}

// ============================================
// HELPERS
// ============================================

function isStaticAsset(url) {
    const staticExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
    return url.origin === self.location.origin &&
        staticExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));
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
        body { font-family: sans-serif; background: #050507; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .offline-container { padding: 20px; }
        h1 { color: #7e3af2; }
        p { opacity: 0.7; max-width: 300px; margin: 20px auto; }
        button { background: #7e3af2; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="offline-container">
        <h1>You're Offline</h1>
        <p>Your session is active but we can't reach the network. All data is being saved locally.</p>
        <button onclick="window.location.reload()">Retry Connection</button>
    </div>
</body>
</html>`;
}

// ============================================
// EVENTS
// ============================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
