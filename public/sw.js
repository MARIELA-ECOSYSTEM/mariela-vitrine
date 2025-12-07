const CACHE_NAME = 'mariela-images-v1';
const IMAGE_CACHE_NAME = 'mariela-images-cache-v1';

// URLs to cache on install
const STATIC_ASSETS = [
  '/favicon.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== IMAGE_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache images on demand
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Cache images (from any origin)
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }
});

// Check if request is for an image
function isImageRequest(request) {
  const url = new URL(request.url);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  const acceptHeader = request.headers.get('accept') || '';
  
  return (
    imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext)) ||
    acceptHeader.includes('image/')
  );
}

// Cache-first strategy for images
async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  
  // Try to get from cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.ok) {
      // Clone the response before caching (responses can only be used once)
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If fetch fails and we have no cache, return a fallback or error
    console.error('Failed to fetch image:', error);
    throw error;
  }
}
