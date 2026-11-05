#!/usr/bin/env node
/*
 * AMAN.D — التحقق البنيوي قبل البناء.
 * لا يتصل بالشبكة ولا بقاعدة البيانات، ولا يطبق ترحيلات.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, extname, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const required = [
  "index.html",
  "client/index.html", "client/app.js", "client/pwa.js", "client/sw.js", "client/manifest.webmanifest",
  "client/icons/icon-192.png", "client/icons/icon-512.png", "client/icons/icon-maskable-512.png", "client/icons/apple-touch-icon.png",
  "admin/index.html", "admin/app.js", "admin/requests.js", "admin/numbers.js", "admin/customers.js",
  "admin/tasks.js", "admin/reports.js", "admin/complaints.js", "admin/messaging.js",
  "admin/companies.js", "admin/catalog.js", "admin/content-audit.js", "admin/account.js",
  "admin/pwa.js", "admin/sw.js", "admin/manifest.webmanifest",
  "admin/icons/icon-192.png", "admin/icons/icon-512.png", "admin/icons/icon-maskable-512.png", "admin/icons/apple-touch-icon.png",
  "assets/brand/logo-mark.png", "assets/brand/logo-mark-light.png",
  "shared/config.js", "shared/runtime.js", "shared/supabase-adapter.js", "shared/theme.js",
  "shared/ui-icons.js", "shared/compact-filters.js", "shared/pull-to-refresh.js",
  "styles/base.css", "styles/visual.css", "styles/admin-login.css",
  "scripts/validate.mjs", "scripts/build.mjs", "scripts/serve.mjs"
];
const exists = path => existsSync(resolve(ROOT, path));
for (const path of required) if (!exists(path)) failures.push("ملف مطلوب مفقود: " + path);

function walk(dir) {
  if (!exists(dir)) return [];
  const out = [];
  for (const name of readdirSync(resolve(ROOT, dir))) {
    const path = dir + "/" + name;
    const info = statSync(resolve(ROOT, path));
    if (info.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}
const runtimeFiles = [
  ...walk("client"), ...walk("admin"), ...walk("shared"), ...walk("styles"),
  ...walk("assets"), "index.html"
].filter(path => exists(path));

for (const htmlPath of ["index.html", "client/index.html", "admin/index.html"]) {
  if (!exists(htmlPath)) continue;
  const html = readFileSync(resolve(ROOT, htmlPath), "utf8");
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(https?:|data:|#|mailto:|tel:|javascript:)/i.test(ref)) continue;
    const clean = ref.split(/[?#]/, 1)[0];
    if (!clean) continue;
    const target = resolve(dirname(resolve(ROOT, htmlPath)), clean);
    const rel = relative(ROOT, target);
    if (rel.startsWith(".." + sep) || rel === "..") {
      failures.push(htmlPath + " يشير خارج AMAN.D: " + ref);
    } else if (!existsSync(target)) {
      failures.push(htmlPath + " يشير إلى ملف غير موجود: " + ref);
    }
  }
  if (/__AMAN_SIMULATION__|simulation-adapter|\/simulation\//i.test(html))
    failures.push("إشارة إلى المحاكاة في واجهة المنتج: " + htmlPath);
}

const jsFiles = runtimeFiles.filter(path => [".js", ".mjs"].includes(extname(path)));
for (const path of jsFiles) {
  const check = spawnSync(process.execPath, ["--check", resolve(ROOT, path)], { encoding: "utf8" });
  if (check.status !== 0) failures.push("خطأ صياغة JavaScript في " + path + ": " + (check.stderr || check.stdout));
}

const independentPattern = /AMAN\.C|AMAN\.B|simulation-adapter|__AMAN_SIMULATION__|local-preview\.mjs/i;
for (const path of runtimeFiles.filter(path => !path.startsWith("assets/"))) {
  const source = readFileSync(resolve(ROOT, path), "utf8");
  let executableSource = source;
  if (/\.(?:js|mjs)$/i.test(path)) {
    executableSource = executableSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  } else if (/\.css$/i.test(path)) {
    executableSource = executableSource.replace(/\/\*[\s\S]*?\*\//g, "");
  } else if (/\.html$/i.test(path)) {
    executableSource = executableSource.replace(/<!--([\s\S]*?)-->/g, "");
  }
  if (independentPattern.test(executableSource))
    failures.push("مرجع إلى المشروع القديم أو المحاكاة في كود التشغيل: " + path);
  if (/service[_-]?role|sb_secret_[A-Za-z0-9_-]{12,}/i.test(source))
    failures.push("احتمال وجود مفتاح سري في ملف تشغيل: " + path);
}
for (const path of [...walk("client"), ...walk("admin")].filter(path => path.endsWith(".js") && !path.endsWith("/pwa.js") && !path.endsWith("/sw.js"))) {
  const source = readFileSync(resolve(ROOT, path), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  if (/localStorage|sessionStorage|indexedDB/.test(source))
    failures.push("واجهة تصل إلى التخزين مباشرة بدل طبقة الخدمات: " + path);
}

for (const app of ["client", "admin"]) {
  const htmlPath = app + "/index.html";
  const swPath = app + "/sw.js";
  const manifestPath = app + "/manifest.webmanifest";
  if (!exists(htmlPath) || !exists(swPath) || !exists(manifestPath)) continue;
  const html = readFileSync(resolve(ROOT, htmlPath), "utf8");
  const sw = readFileSync(resolve(ROOT, swPath), "utf8");
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = match[1];
    if (/^(https?:|data:|#|mailto:|tel:|javascript:)/i.test(ref)) continue;
    if (!sw.includes(ref)) failures.push("PWA: مورد محلي غير موجود في قائمة precache لـ " + app + ": " + ref);
  }
  if (!html.includes('rel="manifest" href="./manifest.webmanifest"'))
    failures.push("PWA: ربط manifest مفقود في " + htmlPath);
  if (!html.includes('src="./pwa.js"'))
    failures.push("PWA: تحميل pwa.js مفقود في " + htmlPath);
  if (!sw.includes("__BUILD_ID__")) failures.push("PWA: علامة __BUILD_ID__ مفقودة في " + swPath);
  let manifest;
  try { manifest = JSON.parse(readFileSync(resolve(ROOT, manifestPath), "utf8")); }
  catch (error) { failures.push("PWA: manifest غير صالح في " + manifestPath + ": " + error.message); continue; }
  for (const key of ["id", "name", "short_name", "start_url", "scope", "display", "icons"])
    if (!manifest[key]) failures.push("PWA: الحقل " + key + " مفقود في " + manifestPath);
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  for (const icon of icons) if (!exists(app + "/" + icon.src))
    failures.push("PWA: أيقونة غير موجودة في " + app + ": " + icon.src);
  if (!icons.some(icon => icon.sizes === "192x192" && icon.type === "image/png"))
    failures.push("PWA: أيقونة PNG بحجم 192 مفقودة في " + app);
  if (!icons.some(icon => icon.sizes === "512x512" && icon.type === "image/png" && (icon.purpose || "any").includes("any")))
    failures.push("PWA: أيقونة PNG بحجم 512 مفقودة في " + app);
  if (!icons.some(icon => String(icon.purpose || "").includes("maskable")))
    failures.push("PWA: أيقونة maskable مفقودة في " + app);
}

if (failures.length) {
  console.error("فشل التحقق البنيوي لـ AMAN.D:");
  console.error([...new Set(failures)].map((item,index)=>(index+1)+". "+item).join("\n"));
  process.exit(1);
}
console.log("نجح التحقق البنيوي: الملفات والمسارات والصياغة والاستقلال ومراجع PWA سليمة.");
