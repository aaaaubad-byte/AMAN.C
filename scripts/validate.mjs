import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";

const required = [
  "index.html", "client/index.html", "client/app.js",
  "admin/index.html", "admin/app.js", "admin/phase3-a5-a8.js", "admin/phase3-a9-a12.js", "admin/phase3-a13-a17.js", "admin/phase4-a18-a25.js", "styles/app.css", "demo/demo-services.js"
];
const failures = [];
for (const file of required) {
  if (!existsSync(resolve(file))) failures.push("ملف مفقود: " + file);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
const htmlFiles = ["index.html", "client/index.html", "admin/index.html"];
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(https?:|#|mailto:|tel:)/i.test(ref)) continue;
    const target = resolve(dirname(resolve(file)), ref);
    if (!existsSync(target)) failures.push(file + " يشير إلى ملف غير موجود: " + ref);
  }
}
for (const file of ["client/app.js", "admin/app.js", "admin/phase3-a5-a8.js", "admin/phase3-a9-a12.js", "admin/phase3-a13-a17.js", "admin/phase4-a18-a25.js", "demo/demo-services.js"]) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) failures.push("خطأ صياغة JavaScript في " + file + ": " + check.stderr);
}
for (const file of ["client/index.html", "admin/index.html"]) {
  const html = readFileSync(file, "utf8");
  if (/shared\/storage\.js|localStorage/i.test(html)) {
    failures.push("يجب ألا تعتمد واجهة المنتج على تخزين المتصفح التجريبي: " + file);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("نجح الفحص: ملفات المنتج وDemo موجودة، المسارات سليمة، وصياغة JavaScript صحيحة، ولا يوجد ربط بتخزين الاختبار في وضع الإنتاج.");
