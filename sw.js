const CACHE_NAME = 'neonsync-studio-offline-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

// 1. ติดตั้ง Service Worker และบันทึกไฟล์หลักของแอปลงเครื่องทันที
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ลบ Cache เวอร์ชันเก่าทิ้งอัตโนมัติเมื่อมีการอัปเดตโค้ดใหม่
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. ดึงไฟล์จาก Cache มาแสดงผลก่อน (รวมถึง Tailwind CSS และฟอนต์) ทำให้เปิดตอนไม่มีเน็ตได้ 100%
self.addEventListener('fetch', (event) => {
  // ข้ามคำขอที่ไม่ใช่ GET หรือคำขอที่ส่งไปหา Gemini AI API
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('generativelanguage.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // กรณีไม่มีอินเทอร์เน็ตและเปิดหน้าแอปหลัก ให้ส่งหน้า index.html ที่เก็บไว้แสดงทันที
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
