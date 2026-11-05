import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adapter = readFileSync(join(ROOT, "shared/supabase-adapter.js"), "utf8");
const migrationsDir = join(ROOT, "supabase/migrations");
const migrations = readdirSync(migrationsDir)
  .filter(name => name.endsWith(".sql"))
  .map(name => readFileSync(join(migrationsDir, name), "utf8"))
  .join("\n");

test("كل دوال RPC التي يستدعيها المحوّل معرّفة في ترحيلات AMAN.D", () => {
  const called = [...adapter.matchAll(/\["((?:client|admin)_[a-z0-9_]+)",\s*(?:true|false)\]/g)]
    .map(match => match[1]);
  const defined = new Set(
    [...migrations.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)]
      .map(match => match[1].toLowerCase())
  );
  assert.ok(called.length > 0, "لم تُكتشف دوال RPC في المحوّل");
  const missing = called.filter(name => !defined.has(name));
  assert.deepEqual(missing, [], "دوال RPC غير معرفة في ترحيلات قاعدة البيانات");
  assert.equal(new Set(called).size, called.length, "يوجد تكرار في أسماء دوال RPC بالمحوّل");
});
