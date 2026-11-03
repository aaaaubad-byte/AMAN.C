import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stampServiceWorkers, normalizeBuildId, PLACEHOLDER } from "../scripts/build-pwa.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APPS = ["client", "admin"];

function pngSize(file) {
  const buf = readFileSync(file);
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file + " ليس PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

for (const app of APPS) {
  test(app + ": manifest صالح وأيقوناته موجودة بأحجامها الصحيحة", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, app, "manifest.webmanifest"), "utf8"));
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.dir, "rtl");
    assert.equal(manifest.lang, "ar");
    assert.equal(manifest.id, "aman-" + app);
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");
    for (const icon of manifest.icons) {
      const file = join(ROOT, app, icon.src);
      assert.ok(existsSync(file), "أيقونة مفقودة: " + icon.src);
      if (icon.type === "image/png") {
        const { width, height } = pngSize(file);
        assert.equal(icon.sizes, width + "x" + height, "حجم مُعلن لا يطابق الملف: " + icon.src);
      }
    }
    assert.ok(manifest.icons.some(icon => icon.purpose === "maskable"));
    const { width, height } = pngSize(join(ROOT, app, "icons", "apple-touch-icon.png"));
    assert.deepEqual([width, height], [180, 180]);
  });

  test(app + ": الصفحة تربط manifest وpwa.js وأيقونة iOS", () => {
    const html = readFileSync(join(ROOT, app, "index.html"), "utf8");
    assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
    assert.match(html, /<link rel="apple-touch-icon" href="\.\/icons\/apple-touch-icon\.png">/);
    assert.match(html, /<script defer src="\.\/pwa\.js"><\/script>/);
  });

  test(app + ": Service Worker لا يخزّن طلبات Supabase ولا يتخطى حدود نطاقه", () => {
    const sw = readFileSync(join(ROOT, app, "sw.js"), "utf8");
    assert.ok(sw.includes(PLACEHOLDER));
    assert.match(sw, /url\.origin !== self\.location\.origin\) return false/);
    assert.match(sw, /SENSITIVE_PATH/);
    assert.doesNotMatch(sw, /skipWaiting\(\);\s*\n\s*\}\);\s*\n/, "لا skipWaiting تلقائي عند التثبيت");
    assert.match(sw, /PREFIX = "aman-" \+ APP \+ "-" \+ new URL\(SCOPE\)\.pathname/);
  });

  test(app + ": شريط التحديث بهوية أمان بلا أخضر وبلا استثناء /test/", () => {
    const js = readFileSync(join(ROOT, app, "pwa.js"), "utf8");
    assert.doesNotMatch(js, /#09a478/i);
    assert.doesNotMatch(js, /\\\/test\\\//);
    assert.match(js, /#102d45/);
  });
}

test("build-pwa يختم معرّف الإصدار في كل sw.js ويفشل بلا علامة", () => {
  const dir = mkdtempSync(join(tmpdir(), "aman-pwa-"));
  try {
    for (const base of ["", "test/"]) for (const app of APPS) {
      mkdirSync(join(dir, base + app), { recursive: true });
      cpSync(join(ROOT, app, "sw.js"), join(dir, base + app, "sw.js"));
    }
    const files = stampServiceWorkers(dir, "abc123");
    assert.equal(files.length, 4);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      assert.ok(!text.includes(PLACEHOLDER));
      assert.ok(text.includes('const BUILD = "abc123";'));
    }
    assert.throws(() => stampServiceWorkers(dir, "again"), /غير موجودة/);
    const empty = join(dir, "empty");
    mkdirSync(empty);
    assert.throws(() => stampServiceWorkers(empty, "x"), /sw\.js/);
    writeFileSync(join(empty, "sw.js"), "no placeholder");
    assert.throws(() => stampServiceWorkers(empty, "x"), /غير موجودة/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("normalizeBuildId ينظّف القيمة ويولّد بديلًا عند الفراغ", () => {
  assert.equal(normalizeBuildId(" a1b2/c3;`x "), "a1b2c3x");
  assert.equal(normalizeBuildId("x".repeat(80)).length, 40);
  assert.match(normalizeBuildId(""), /^t[a-z0-9]+$/);
});
