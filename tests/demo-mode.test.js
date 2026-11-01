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

const adminA13A17=readFileSync("admin/phase3-a13-a17.js","utf8");
test("A13-A17 module is loaded and exposes task, revenue and complaints contracts",()=>{
 assert.ok(admin.includes('phase3-a13-a17.js'));
 for(const name of ["getTaskDetails","executeTask","previewTaskReschedule","rescheduleTask","getRevenueReport","listComplaints"]) assert.ok(demo.includes(name));
 for(const screen of ["tasks","reports","complaints"]) assert.ok(adminA13A17.includes('screen==="'+screen+'"'));
});
test("Task execution is one-time and rescheduling excludes executed tasks",()=>{

 assert.match(demo,/t\.status="executed"/);
 assert.match(demo,/x\.status!=="executed"/);
});
test("Revenue report includes approved requests only and complaints are read-only in A17",()=>{
 assert.match(demo,/x\.status==="approved"/);
 assert.match(adminA13A17,/function complaintDetail/);
 assert.doesNotMatch(adminA13A17,/resolveComplaint|deleteComplaint/);
});

const adminA18A25=readFileSync("admin/phase4-a18-a25.js","utf8");
test("A18-A25 module is loaded and covers complaints, notifications, alerts and company settings",()=>{
 assert.ok(admin.includes("phase4-a18-a25.js"));
 for(const screen of ["complaints","notifications","alerts","settings"])assert.ok(adminA18A25.includes('s==="'+screen+'"')||adminA18A25.includes('s==="'+screen+'"'));
 for(const method of ["decideComplaint","listAdminNotifications","createAdminNotification","listAdminAlerts","createAdminAlert","listCompanies","saveCompanySettings"])assert.ok(demo.includes(method));
});
test("Complaint decisions require a reason and protection termination requires an active protection",()=>{
 assert.match(demo,/!String\(p\.reason\|\|""\)\.trim\(\)/);
 assert.match(demo,/n\.status!=="protected"/);
 assert.match(adminA18A25,/سبب القرار \(إلزامي\)/);
});
test("Reactivation and task schedule settings are stored independently per company",()=>{
 assert.match(demo,/reactivation_enabled:p\.reactivation_enabled/);
 assert.match(demo,/reactivation_days:p\.reactivation_days/);
 assert.match(demo,/task_interval_days:p\.task_interval_days/);
 assert.match(adminA18A25,/إعداد التنشيط مستقل لهذه الشركة/);
});
test("Manual number alerts validate the selected number-to-customer relationship",()=>{
 assert.match(demo,/n\.customer_id/);
 assert.match(demo,/createAdminAlert/);
});
