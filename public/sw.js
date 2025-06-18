// Service Worker para Katana Sushi - Siempre requiere conexión
const CACHE_NAME = 'katana-sushi-v1.0.0';
const urlsToCache = [
  '/css/styles.css',
  '/css/dashboard.css',
  '/js/main.js',
  '/js/dashboard.js',
  '/images/LOGO-SIN-FONDO.png',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto para recursos estáticos');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones - Solo cachear recursos estáticos
self.addEventListener('fetch', (event) => {
  // Solo cachear recursos estáticos (CSS, JS, imágenes)
  if (event.request.destination === 'style' || 
      event.request.destination === 'script' || 
      event.request.destination === 'image') {
    
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Si está en cache, devolverlo
          if (response) {
            return response;
          }

          // Si no está en cache, hacer la petición
          return fetch(event.request)
            .then((response) => {
              // Verificar que la respuesta sea válida
              if (!response || response.status !== 200) {
                return response;
              }

              // Clonar la respuesta para cachearla
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            });
        })
    );
  }
  
  // Para todas las demás peticiones (API, páginas), siempre requerir conexión
  // No hacer nada especial, dejar que se manejen normalmente
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 