const CACHE_NAME = 'dovoz-pwa-v3'; // Обновили версию

const CACHE_URLS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'pwa.js',
  'manifest.json',
  'icons/icon-144.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// УСТАНОВКА
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Кэшируем статические файлы');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// АКТИВАЦИЯ + ОЧИСТКА СТАРОГО КЭША
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Удаляем старый кэш:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ПЕРЕХВАТ ЗАПРОСОВ
self.addEventListener('fetch', event => {
  // 🔹 НЕ КЭШИРУЕМ ЗАПРОСЫ К GOOGLE SCRIPT
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  // Кэшируем только статику
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
