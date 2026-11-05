#!/usr/bin/env node
/*
 * AMAN.D — بناء نسخة النشر المستقلة.
 * الناتج: dist/ ويحتوي ملفات التشغيل فقط، دون مصادر AMAN.B أو أدوات التطوير أو الاختبارات.
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const PUBLISHED = ["index.html", "client", "admin", "shared", "styles", "assets"];

function buildId() {
  const raw = process.env.BUILD_ID || process.env.GITHUB_SHA || new Date().toISOString().replace(/[-:.TZ]/g, "");
  return String(raw).trim().replace(/[^A-Za-z0-9._-]/g, "").slice(0, 40) || "aman-d";
}

async function copyPublished() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  for (const entry of PUBLISHED) {
    const source = join(ROOT, entry);
    if (!existsSync(source)) throw new Error("ملف أو مجلد النشر مفقود: " + entry);
    await cp(source, join(DIST, entry), {
      recursive: true,
      filter: path => !path.endsWith(".gitkeep") && !path.endsWith(".md")
    });
  }
}

async function stampWorkers(id) {
  for (const app of ["client", "admin"]) {
    const path = join(DIST, app, "sw.js");
    const source = await readFile(path, "utf8");
    if (!source.includes("__BUILD_ID__")) throw new Error("علامة الإصدار مفقودة في " + app + "/sw.js");
    const stamped = source.split("__BUILD_ID__").join(id);
    if (stamped.includes("__BUILD_ID__")) throw new Error("تعذر ختم إصدار " + app);
    await writeFile(path, stamped, "utf8");
  }
}

async function main() {
  const validation = spawnSync(process.execPath, [join(ROOT, "scripts", "validate.mjs")], {
    cwd: ROOT, encoding: "utf8", stdio: "inherit"
  });
  if (validation.status !== 0) throw new Error("فشل التحقق؛ لم تُنشأ نسخة النشر.");
  await copyPublished();
  const id = buildId();
  await stampWorkers(id);
  console.log("اكتمل بناء AMAN.D في dist/ — الإصدار: " + id);
  console.log("المجلدات المنشورة: " + PUBLISHED.join("، "));
}

main().catch(error => {
  console.error("فشل بناء AMAN.D: " + error.message);
  process.exitCode = 1;
});
