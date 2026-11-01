import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

test("طبقة إعادة التصميم تعطي رسائل الخطأ والنجاح والمعلومة حالات مرئية متميزة", () => {
  for (const selector of [".notice-error:not(:empty)", ".notice-success:not(:empty)", ".notice-info:not(:empty)"]) {
    assert.ok(css.includes(selector), `النمط مفقود: ${selector}`);
  }
  assert.match(css, /\.notice-error:not\(:empty\)[^{]*\{[^}]*background:var\(--red-bg\)/);
  assert.match(css, /\.notice-success:not\(:empty\)[^{]*\{[^}]*background:var\(--green-bg\)/);
});

test("نماذج الإدارة والنوافذ الديناميكية قابلة للاستخدام على الهاتف", () => {
  assert.match(css, /\.admin-generic-view textarea\.field/);
  assert.match(css, /\.admin-decision-dialog\[open\]/);
  assert.match(css, /@media\(max-width:420px\)[\s\S]*?\.admin-decision-dialog/);
});

test("التحريك الإضافي يحترم تفضيل تقليل الحركة", () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.admin-decision-dialog\[open\]\{animation:none\}/);
});
