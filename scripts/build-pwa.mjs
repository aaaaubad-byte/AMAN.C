#!/usr/bin/env node
/*
 * AMAN.C — ختم إصدار الـ PWA عند النشر.
 *
 *   node scripts/build-pwa.mjs <مجلد-النشر> [معرّف-الإصدار]
 *
 * يستبدل العلامة __BUILD_ID__ في كل ملف sw.js داخل مجلد النشر (client وadmin ونسخة /test/)
 * بمعرّف الإصدار، فيتغيّر محتوى كل Service Worker مع كل نشر ويكتشف المتصفح الإصدار الجديد.
 * معرّف الإصدار: الوسيط الثاني، ثم BUILD_ID، ثم GITHUB_SHA، ثم الوقت الحالي.
 * يفشل (رمز خروج 1) إن لم يجد أي sw.js أو بقيت العلامة في أي ملف بعد الاستبدال.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PLACEHOLDER = "__BUILD_ID__";

export function normalizeBuildId(raw) {
  const id = String(raw || "").trim().replace(/[^A-Za-z0-9._-]/g, "").slice(0, 40);
  return id || "t" + Date.now().toString(36);
}

function findServiceWorkers(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) findServiceWorkers(path, found);
    else if (name === "sw.js") found.push(path);
  }
  return found;
}

export function stampServiceWorkers(dir, buildId) {
  const files = findServiceWorkers(resolve(dir));
  if (!files.length) throw new Error("لم يُعثر على أي sw.js داخل " + dir);
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (!source.includes(PLACEHOLDER)) throw new Error("العلامة " + PLACEHOLDER + " غير موجودة في " + file);
    const stamped = source.split(PLACEHOLDER).join(buildId);
    if (stamped.includes(PLACEHOLDER)) throw new Error("بقيت العلامة في " + file);
    writeFileSync(file, stamped);
  }
  return files;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [dir, explicit] = process.argv.slice(2);
  if (!dir) {
    console.error("الاستخدام: node scripts/build-pwa.mjs <مجلد-النشر> [معرّف-الإصدار]");
    process.exit(1);
  }
  try {
    const buildId = normalizeBuildId(explicit || process.env.BUILD_ID || process.env.GITHUB_SHA);
    const files = stampServiceWorkers(dir, buildId);
    console.log("تم ختم الإصدار " + buildId + " في " + files.length + " ملف(ات) sw.js:");
    for (const file of files) console.log(" - " + file);
  } catch (error) {
    console.error("فشل ختم الإصدار: " + error.message);
    process.exit(1);
  }
}
