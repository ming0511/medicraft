/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		).then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	// 동일 출처만 처리 (Supabase·구글 등 외부 요청은 SW 우회).
	if (url.origin !== sw.location.origin) return;

	const isAsset = ASSETS.includes(url.pathname);

	// 해시된 빌드 에셋만 cache-first (내용이 불변이라 안전).
	if (isAsset) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(event.request);
				if (cached) return cached;
				const response = await fetch(event.request);
				if (response.status === 200) cache.put(event.request, response.clone());
				return response;
			})()
		);
		return;
	}

	// 그 외(HTML 네비게이션·/_app/env.js·API 등)는 항상 네트워크 우선.
	// 옛 셸/런타임 env 가 캐시에 박혀 stale 코드가 서빙되는 걸 방지.
	// 오프라인일 때만 마지막 수단으로 캐시된 네비게이션 폴백.
	event.respondWith(
		(async () => {
			try {
				return await fetch(event.request);
			} catch {
				if (event.request.mode === 'navigate') {
					const cache = await caches.open(CACHE);
					const fallback = await cache.match('/');
					if (fallback) return fallback;
				}
				return new Response('Offline', { status: 503 });
			}
		})()
	);
});
