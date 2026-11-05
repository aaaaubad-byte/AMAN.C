import test from "node:test";
import assert from "node:assert/strict";
import { readProjectFile } from "./helpers.mjs";

const base=readProjectFile("styles/base.css");
const visual=readProjectFile("styles/visual.css");

test("نظام الألوان يعرّف الفيروزي كرمز موحد",()=>{
  assert.match(base,/:root\s*\{/);
  assert.match(base,/--turquoise\s*:\s*#078F87/i);
  assert.match(base,/html\[data-theme="dark"\]\s*\{/);
  assert.match(base,/--accent-ink\s*:\s*var\(--turquoise-deep\)/);
  assert.doesNotMatch(base,/--turquoise\s*:\s*#(?:079f7a|10ab86)/i);
  assert.doesNotMatch(visual,/#(?:079f7a|10ab86)/i);
});

test("القيم اللونية القديمة لا تعود خارج تعريفات الرموز",()=>{
  assert.doesNotMatch(base,/#079f7a|#10ab86/i);
  const legacyMint=[...base.matchAll(/#65d4b3/gi)];
  assert.ok(legacyMint.length<=1);
  if(legacyMint.length) assert.match(base,/--accent-ink\s*:\s*#65d4b3/i);
});

test("حقول textarea لها ارتفاع تلقائي ولا تفرض ارتفاعًا ثابتًا",()=>{
  const match=base.match(/textarea\.field\s*\{([^}]*)\}/);
  assert.ok(match,"قاعدة textarea.field مفقودة");
  assert.match(match[1],/height\s*:\s*auto/i);
  assert.match(match[1],/min-height/i);
});

test("الطبقة البصرية تعتمد الرموز المشتركة بدل إعادة تعريف لوحة ألوان متعارضة",()=>{
  assert.match(visual,/var\(--turquoise\)/);
  assert.doesNotMatch(visual,/#079f7a|#10ab86/i);
});
