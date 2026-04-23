const CACHE_NAME = 'mariela-app-v4';
const IMAGE_CACHE_NAME = 'mariela-images-cache-v4';
const DATA_CACHE_NAME = 'mariela-data-cache-v4';

// Max cache sizes to limit storage usage
const MAX_IMAGE_CACHE = 50;
const MAX_DATA_CACHE = 20;

// URLs to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
];

// API endpoints to cache
const API_ENDPOINTS = [
  'https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/config',
  'https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/produtos',
  'https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/produto/',
  'https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/colecoes',
  'https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/categorias'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and non-http requests
  if (!url.protocol.startsWith('http')) return;

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

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Limit cache size
      const keys = await cache.keys();
      if (keys.length >= MAX_IMAGE_CACHE) {
        await cache.delete(keys[0]);
      }
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return a transparent pixel fallback instead of throwing
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

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

// Limit data cache size helper
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    for (let i = 0; i < keys.length - maxItems; i++) {
      await cache.delete(keys[i]);
    }
  }
}

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
