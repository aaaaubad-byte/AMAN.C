import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";

const required = [
  "index.html", "client/index.html", "client/app.js",
  "admin/index.html", "admin/app.js", "shared/storage.js",
  "styles/app.css"
];
const failures = [];
for (const file of required) {
  if (!existsSync(resolve(file))) failures.push("ملف مفقود: " + file);
}
if (failures.length) {
  console.error(failures.join("\\n"));
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
for (const file of ["client/app.js", "admin/app.js", "shared/storage.js"]) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) failures.push("خطأ صياغة JavaScript في " + file + ": " + check.stderr);
}
if (failures.length) {
  console.error(failures.join("\\n"));
  process.exit(1);
}
console.log("نجح الفحص: الملفات موجودة، المسارات سليمة، وصياغة JavaScript صحيحة.");
