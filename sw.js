const CACHE_NAME = 'neonsync-studio-offline-v9';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

// 1. ขั้นตอนติดตั้ง (Install): บันทึกไฟล์หลักและโลโก้ลงเครื่องทันที
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => {});
    })
  );
});

// 2. ขั้นตอนเปิดใช้งาน (Activate): ล้างข้อมูลแคชเวอร์ชันเก่าทิ้งทั้งหมดเพื่อให้ได้โลโก้และโค้ดล่าสุด
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

// 3. ขั้นตอนดึงข้อมูล (Fetch): รองรับการใช้งานออฟไลน์ 100% และข้าม API ของ AI
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ไม่แคชการเชื่อมต่อ Gemini API (สำหรับการถอดเนื้อเพลงออนไลน์)
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // กรณีเปิดหน้าเว็บหลัก (Navigation) ให้โหลดจากเน็ตก่อน หากปิดเน็ตให้ดึงจากแคชทันที
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // สำหรับไฟล์โลโก้, CSS, ฟอนต์ และสคริปต์ต่างๆ
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
