const CACHE_NAME = 'sot-track-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin-login.html',
    '/worker-login.html',
    '/register.html',
    '/admin-dashboard.html',
    '/worker-dashboard.html',
    '/leaderboard.html',
    '/messages.html',
    '/settings.html',
    '/style.css',
    '/app.js',
    '/admin.js',
    '/leaderboard.js',
    '/login.js',
    '/messages.js',
    '/nav.js',
    '/register.js',
    '/settings.js',
    '/ui.js',
    '/ws-client.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js'
];

// Install the service worker and cache all the app's content
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            }
        )
    );
});
