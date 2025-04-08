// Basic service worker for FoodBao Admin
const CACHE_NAME = 'foodbao-admin-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/css/styles.css',
  '/js/app.js',
  '/src/css/materialize.min.css',
  '/img/hawkerbg.jpg',
  '/img/FBLogo.jpg'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activated');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching');
  
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});