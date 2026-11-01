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

test("A18 exposes the terminate-protection decision only when the number has active protection",()=>{
 assert.match(demo,/protection_active:db\.numbers\.find\(n=>n\.phone===r\.phone\)\?\.status==="protected"/);
 assert.match(adminA18A25,/if\(r\.protection_active===true\)choices\.push/);
});
test("A19-A20 preview recipient count and require explicit confirmation before sending",()=>{
 assert.match(adminA18A25,/معاينة المستلمين/);
 assert.match(adminA18A25,/تأكيد وإرسال الإشعار/);
});
test("A21-A22 alert picker includes only numbers linked to valid customers and displays the customer",()=>{
 assert.match(adminA18A25,/filter\(x=>x\.customer_id&&valid\.has\(x\.customer_id\)\)/);
 assert.match(adminA18A25,/linked_customer_name/);
});
test("A23-A25 company settings preview schedule impact and reject conflicting prefixes",()=>{
 assert.match(demo,/previewCompanySettings:async/);
 assert.match(demo,/توجد بادئة مستخدمة بالفعل لدى شركة أخرى/);
 assert.match(demo,/t\.status!=="executed"/);
});

test("A19 notification history distinguishes automatic and manual notifications and shows read state",()=>{
 assert.match(demo,/source_label:n\.source==="manual"\?"يدوي":"آلي"/);
 assert.match(adminA18A25,/القراءة:/);
});
test("A24 requires a fresh impact preview after changing the interval",()=>{
 assert.match(adminA18A25,/interval\.input\.addEventListener\("input"/);
 assert.match(adminA18A25,/feedback\.dataset\.preview="no"/);
});
test("A23 company cards show the enabled or disabled state",()=>{
 assert.match(adminA18A25,/حالة الشركة:/);
});


const adminA26A31=readFileSync("admin/phase5-a26-a31.js","utf8");
test("A26-A31 module is loaded and all five destinations are registered in admin navigation",()=>{
 assert.ok(admin.includes("phase5-a26-a31.js"));
 for(const screen of ["packages","payments","content","audit","account"]) {
  assert.match(adminA26A31,new RegExp('s==="'+screen+'"'));
  assert.match(readFileSync("admin/app.js","utf8"),new RegExp(screen+':\\{title:'));
 }
});
test("A26 packages are scoped by company and operation with positive duration and price and active state",()=>{
 for(const field of ["company_id","operation_type","days","price_yer","active"]) assert.ok(adminA26A31.includes(field));
 assert.match(demo,/savePackage:async p=>/);
 assert.match(demo,/duration_days:p\.days/);
});
test("A26 package edits are isolated from existing requests and protection periods",()=>{
 assert.match(demo,/savePackage:async p=>[\s\S]*?db\.packages\.push\(target\)/);
 assert.doesNotMatch(demo,/savePackage:async p=>[\s\S]*?db\.requests\.forEach/);
});
test("A27 payment methods store instructions and reference rules without receipt attachments",()=>{
 for(const field of ["summary","instructions","reference_required","reference_pattern","active"]) assert.ok(adminA26A31.includes(field));
 assert.match(adminA26A31,/لا تُرفع صور أو مرفقات إيصالات/);
 assert.match(demo,/savePaymentMethod:async p=>/);
});
test("A28 content editing confirms each save and retains the entered text when saving fails",()=>{
 assert.match(adminA26A31,/تأكيد حفظ نص/);
 assert.match(adminA26A31,/احتفظ بالنص وانسخه قبل إعادة المحاولة/);
 assert.match(demo,/saveAppContent:async p=>/);
});
test("A29 audit log is read-only and supports action and entity filters",()=>{
 assert.match(adminA26A31,/listAuditLog/);
 assert.match(adminA26A31,/action\.input\.addEventListener/);
 assert.match(adminA26A31,/entity\.input\.addEventListener/);
 assert.doesNotMatch(adminA26A31,/deleteAudit|updateAudit|saveAudit/);
});
test("A30-A31 show the authenticated admin and require explicit confirmation before sign-out",()=>{
 assert.match(adminA26A31,/getCurrentAdmin/);
 assert.match(adminA26A31,/confirm\("هل تريد تسجيل الخروج/);
 assert.match(adminA26A31,/signOutAdmin/);
 assert.match(demo,/signOutAdmin:async/);
});
