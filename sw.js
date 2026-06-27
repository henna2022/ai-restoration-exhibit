/* ============================================================
   나도 복원가 — Service Worker (PWA offline support)
   ------------------------------------------------------------
   배포할 때마다 아래 CACHE_VERSION 의 숫자를 올리시오.
   (style.css / script.js 의 ?v= 를 올리는 것과 같은 습관)
   버전을 올리면 옛 캐시는 자동으로 비워지고 새 파일을 받습니다.
   ============================================================ */
const CACHE_VERSION = 'v2';
const CACHE_NAME = `nado-restorer-${CACHE_VERSION}`;

/* 앱 껍데기(shell) — URL 이 고정된 핵심 파일만 미리 캐시.
   style.css / script.js 와 이미지들은 처음 불러올 때 자동 캐시되므로
   (?v= 가 바뀌어도) 여기 적지 않습니다. */
const PRECACHE_URLS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './seoulraim_logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

// 설치: 앱 껍데기를 미리 캐시하고 즉시 활성화
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 활성화: 옛 버전 캐시 삭제 후 모든 탭을 새 워커가 즉시 제어
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('nado-restorer-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 요청 처리
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET 이 아니면 그대로 통과
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 다른 출처(구글 폰트·애널리틱스·Pretendard CDN 등)는 캐시 개입 없이 통과
  if (url.origin !== self.location.origin) return;

  // 페이지(HTML) 이동 요청 → 네트워크 우선, 실패 시 캐시(오프라인 대비)
  // 각 페이지(index.html, admin.html …)를 자기 URL 로 캐시한다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)
          .then((r) => r || caches.match('./index.html'))
          .then((r) => r || caches.match('./')))
    );
    return;
  }

  // 그 외 같은 출처 자원(css·js·이미지·영상) → 캐시 우선, 없으면 네트워크 후 캐시
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        // 정상 응답만 캐시 (불완전한 206/오류 응답 제외)
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
