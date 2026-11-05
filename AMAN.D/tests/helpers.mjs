// أدوات مشتركة لاختبارات AMAN.D — قراءة ساكنة من جذر التطبيق.
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const projectPath = path => resolve(ROOT, path);
export const fileExists = path => existsSync(projectPath(path));
export const readProjectFile = path => readFileSync(projectPath(path), "utf8");
export function stripComments(source) {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}
export function localHtmlReferences(html) {
  return [...String(html).matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map(match => match[1])
    .filter(ref => !/^(https?:|data:|#|mailto:|tel:|javascript:)/i.test(ref));
}
export function staysInsideRoot(path) {
  const rel = relative(ROOT, resolve(ROOT, path));
  return rel !== ".." && !rel.startsWith(".." + sep);
}
