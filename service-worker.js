/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'project-aegis-v1';

// Files to cache for offline use
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Install event - cache files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
    // Force waiting service worker to become active
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        })
    );
    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached version or fetch from network
            if (response) {
                return response;
            }

            return fetch(event.request).then((response) => {
                // Check if valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                // Cache the fetched resource
                caches.open(CACHE_NAME).then((cache) => {
                    // Only cache same-origin requests
                    if (event.request.url.startsWith(self.location.origin)) {
                        cache.put(event.request, responseToCache);
                    }
                });

                return response;
            });
        }).catch(() => {
            // If both cache and network fail, show offline page
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
            return null;
        })
    );
});
