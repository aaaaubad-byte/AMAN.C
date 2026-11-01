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

test("Demo scripts load in deterministic order before app scripts",()=>{
 for(const html of [client,admin]){
  assert.match(html,/demo-services\\.js"><\\/script><script defer src="\\.\\/app\\.js"/);
  assert.doesNotMatch(html,/document\\.write/);
 }
});
test("Customer and admin demo sessions are independent",()=>{
 assert.match(demo,/customer_session/);
 assert.match(demo,/admin_session/);
 assert.doesNotMatch(demo,/db\\.session/);
});
test("Customer login entry exists and matches the app handler",()=>{
 assert.match(client,/id="open-login"/);
 assert.match(readFileSync("client/app.js","utf8"),/getElementById\\("open-login"\\)/);
});
