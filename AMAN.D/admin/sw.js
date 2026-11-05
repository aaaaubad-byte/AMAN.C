/*
 * AMAN.D — Service Worker لتطبيق الإدارة.
 * يخزّن موارد الواجهة العامة المحددة فقط، ولا يخزّن استجابات خاصة أو بيانات جلسات.
 * لا يتعامل مع طلبات Supabase أو أي طلب يحمل بيانات اعتماد.
 */
"use strict";

const APP = "admin";
const BUILD = "__BUILD_ID__";
const SELF_URL = self.location.href;
const SCOPE = new URL("./", SELF_URL).href;
const PREFIX = "aman-d-" + APP + "-" + new URL(SCOPE).pathname.replace(/[^a-z0-9]+/gi, "_") + "-";
const CACHE = PREFIX + BUILD;

const PRECACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./requests.js",
  "./numbers.js",
  "./customers.js",
  "./tasks.js",
  "./reports.js",
  "./complaints.js",
  "./messaging.js",
  "./companies.js",
  "./catalog.js",
  "./content-audit.js",
  "./account.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "../styles/base.css",
  "../styles/visual.css",
  "../styles/admin-login.css",
  "../shared/theme.js",
  "../shared/ui-icons.js",
  "../shared/runtime.js",
  "../shared/config.js",
  "../shared/supabase-adapter.js",
  "../shared/pull-to-refresh.js",
  "../shared/compact-filters.js",
  "../assets/brand/logo-mark.png",
  "../assets/brand/logo-mark-light.png"
].map(path => new URL(path, SELF_URL).href);

const SHARED_ALLOWED = new Set([
  "../styles/base.css",
  "../styles/visual.css",
  "../styles/admin-login.css",
  "../shared/theme.js",
  "../shared/ui-icons.js",
  "../shared/runtime.js",
  "../shared/config.js",
  "../shared/supabase-adapter.js",
  "../shared/pull-to-refresh.js",
  "../shared/compact-filters.js",
  "../assets/brand/logo-mark.png",
  "../assets/brand/logo-mark-light.png"
].map(path => new URL(path, SELF_URL).href));

const APP_STATIC = new Set(PRECACHE);
const PRIVATE_HEADERS = /(?:^|,)\s*(?:private|no-store|no-cache|must-revalidate)\b/i;

function handled(request) {
  if (request.method !== "GET" || request.headers.has("range") || request.headers.has("authorization")) return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search || url.href === SELF_URL) return false;
  if (url.href.startsWith(SCOPE)) {
    if (request.mode === "navigate") return true;
    return APP_STATIC.has(url.href);
  }
  return SHARED_ALLOWED.has(url.href);
}

function cacheable(request, response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  if (response.headers.has("set-cookie") || response.headers.get("vary") === "*") return false;
  if (PRIVATE_HEADERS.test(response.headers.get("cache-control") || "")) return false;
  return !request.headers.has("authorization");
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.allSettled(PRECACHE.map(async url => {
      const request = new Request(url, { method: "GET", credentials: "omit", cache: "reload" });
      const response = await fetch(request);
      if (!cacheable(request, response)) throw new Error("not cacheable: " + url);
      await cache.put(url, response);
    }));
    if (results[0].status !== "fulfilled") throw new Error("admin app shell unavailable");
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (cacheable(request, response)) await cache.put(request, response.clone());
    else await cache.delete(request);
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match(SCOPE);
      if (shell) return shell;
    }
    throw error;
  }
}

self.addEventListener("fetch", event => {
  if (handled(event.request)) event.respondWith(networkFirst(event.request));
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  else if (data.type === "GET_VERSION" && event.source) {
    event.source.postMessage({ type: "VERSION", app: APP, build: BUILD });
  }
});
