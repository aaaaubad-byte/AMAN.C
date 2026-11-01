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


test("Demo services load before the original client and admin scripts",()=>{
 for(const html of [client,admin]){
  assert.ok(html.includes('<script defer src="../demo/demo-services.js"></script><script defer src="./app.js"></script>'));
  assert.ok(!html.includes("document.write"));
 }
});
test("Customer and admin demo sessions are independent",()=>{
 assert.ok(demo.includes("customer_session"));
 assert.ok(demo.includes("admin_session"));
 assert.ok(!demo.includes("db.session"));
 assert.ok(demo.includes("function customer(){return db.users.find(x=>x.id===db.customer_session"));
 assert.ok(demo.includes("function admin(){return db.users.find(x=>x.id===db.admin_session"));
});
test("Customer login entry exists and matches the original app handler",()=>{
 assert.ok(client.includes('id="open-login"'));
 assert.ok(readFileSync("client/app.js","utf8").includes('getElementById("open-login")'));
});

const adminPhase3 = readFileSync("admin/phase3-a9-a12.js","utf8");
test("A9-A12 customer and task screens are loaded and use service contracts",()=>{
 assert.ok(admin.includes('phase3-a9-a12.js'));
 for(const name of ["listCustomers","getCustomerDetails","updateCustomerStatus","listTasks"]) assert.ok(demo.includes(name));
 for(const name of ["customers","tasks"]) assert.ok(adminPhase3.includes('screen==="'+name+'"'));
 assert.match(adminPhase3,/status==="active"\?"disabled":"active"/);
});
test("Demo customer administration excludes admin accounts and protects manager accounts",()=>{
 assert.match(demo,/filter\(x=>!x\.is_admin\)/);
 assert.match(demo,/!u\.is_admin/);
 assert.match(adminPhase3,/if\(!c\.is_admin\)/);
});
