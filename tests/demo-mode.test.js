import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const client = readFileSync("client/index.html","utf8");
const admin = readFileSync("admin/index.html","utf8");
const demo = readFileSync("demo/demo-services.js","utf8");
test("Demo loader is included before app scripts and gated by explicit query flag",()=>{
 assert.match(client,/demo-services\.js/);assert.match(admin,/demo-services\.js/);
 assert.match(demo,/params\.get\("demo"\) !== "1"/);
});
test("Demo services do not reference production backends or secrets",()=>{
 assert.doesNotMatch(demo,/supabase|service_role|https?:\/\//i);
 assert.match(demo,/localStorage/);
});
test("Demo approval only changes pending requests",()=>{
 assert.match(demo,/r\.status!=="pending"/);
});

const deploy = readFileSync(".github/workflows/deploy.yml","utf8");
test("GitHub Pages deployment includes the Demo assets",()=>{
 assert.ok(deploy.includes("cp -R client admin styles demo dist/"));
});
