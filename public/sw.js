const CACHE_NAME = 'mariela-app-v2';
const IMAGE_CACHE_NAME = 'mariela-images-cache-v2';
const DATA_CACHE_NAME = 'mariela-data-cache-v2';

// URLs to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
];

// API endpoints to cache
const API_ENDPOINTS = [
  'https://mariela-pdv-backend.onrender.com/api/vitrine'
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
          .filter((name) => 
            name !== CACHE_NAME && 
            name !== IMAGE_CACHE_NAME && 
            name !== DATA_CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Cache API responses (network first, fallback to cache)
  if (isApiRequest(request)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Cache images (cache first)
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  // For HTML and other assets, use stale-while-revalidate
  if (isHtmlRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// Check if request is for API
function isApiRequest(request) {
  return API_ENDPOINTS.some(endpoint => request.url.includes(endpoint));
}

// Check if request is for HTML
function isHtmlRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return acceptHeader.includes('text/html');
}

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

// Network first strategy for API calls
async function networkFirstApi(request) {
  const cache = await caches.open(DATA_CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache-first strategy for images
async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch image:', error);
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova atualização disponível!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Ver agora' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Mariela Moda', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
