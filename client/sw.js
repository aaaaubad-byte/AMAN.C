/*
 * AMAN.C — Service Worker لتطبيق «العميل» (PWA).
 *
 * - نطاقه /client/ فقط، وله ذاكرة تخزين مؤقت باسم خاص (aman-client-<build>) لا يشاركها تطبيق الإدارة.
 * - الاستراتيجية «الشبكة أولًا»: كل طلب يمرّ على الشبكة مع تجاوز ذاكرة HTTP المؤقتة (cache: "no-cache")،
 *   ولا تُستخدم النسخة المخزّنة إلا عند انقطاع الاتصال. لذلك لا يبقى المستخدم على ملفات قديمة.
 * - لا يعترض إلا طلبات GET من النطاق نفسه داخل /client/ و/styles/ و/services/.
 *   طلبات Supabase (نطاق آخر) والمصادقة وبيانات الـ RPC لا تمرّ عليه ولا تُخزَّن إطلاقًا.
 * - لا skipWaiting تلقائي: النسخة الجديدة تنتظر حتى يختار المستخدم «تحديث الآن» (انظر pwa.js)
 *   أو حتى تُغلق كل نوافذ التطبيق، فلا تُقاطَع عملية جارية.
 * - معرّف الإصدار BUILD يُستبدل عند النشر (scripts/build-pwa.mjs) فيتغيّر هذا الملف مع كل نشر
 *   ويكتشف المتصفح الإصدار الجديد.
 */
"use strict";
const APP = "client";
const BUILD = "__BUILD_ID__";
const SELF_URL = self.location.href;
const SCOPE = new URL("./", SELF_URL).href;
/* البادئة تتضمن مسار النطاق: نسخة الإنتاج ونسخة /test/ لا تحذفان ذاكرة بعضهما. */
const PREFIX = "aman-" + APP + "-" + new URL(SCOPE).pathname.replace(/[^a-z0-9]+/gi, "_") + "-";
const CACHE = PREFIX + BUILD;
const ROOT = new URL("../", SELF_URL).href;
const SHARED = [ROOT + "styles/", ROOT + "services/"];
const PRECACHE = [
  "./", "./app.js", "./ui-v5.js", "./pwa.js", "./manifest.webmanifest", "./icons/icon.svg",
  "../styles/app.css", "../services/runtime.js", "../services/supabase-config.js", "../services/supabase-adapter.js"
].map(p => new URL(p, SELF_URL).href);
const SENSITIVE_PATH = /\/(auth|rest|functions|storage|realtime)\/v\d/i;

const cacheable = res => !!res && res.ok && res.type === "basic" && !/no-store/i.test(res.headers.get("cache-control") || "");

function handled(req) {
  if (req.method !== "GET" || req.headers.has("range")) return false;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return false;
  if (url.href === SELF_URL || SENSITIVE_PATH.test(url.pathname)) return false;
  return url.href.startsWith(SCOPE) || SHARED.some(prefix => url.href.startsWith(prefix));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.allSettled(PRECACHE.map(async url => {
      const res = await fetch(url, { cache: "reload" });
      if (!cacheable(res)) throw new Error("not cacheable: " + url);
      await cache.put(url, res);
    }));
    if (results[0].status !== "fulfilled") throw new Error("app shell unavailable");
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

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (cacheable(res)) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    if (req.mode === "navigate") {
      const shell = await cache.match(SCOPE);
      if (shell) return shell;
    }
    throw err;
  }
}

self.addEventListener("fetch", event => {
  if (!handled(event.request)) return;
  event.respondWith(networkFirst(event.request));
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  else if (data.type === "GET_VERSION" && event.source) event.source.postMessage({ type: "VERSION", app: APP, build: BUILD });
});
