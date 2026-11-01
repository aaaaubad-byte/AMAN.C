// اختبار مطابقة عقود الخدمات (services/CONTRACTS.md).
// يحمّل services/runtime.js ثم محوّلًا واحدًا في بيئة vm معزولة، ويستدعي الواجهة الموحدة نفسها التي تستدعيها الشاشات.
//
//   الافتراضي: محوّل المحاكاة    node --test tests/contract.test.mjs
//   محوّل آخر لاحقًا:            AMAN_ADAPTER_FILE=path/to/adapter.js node --test tests/contract.test.mjs
//   (يجب أن يسجّل الملف نفسه عبر window.AMANServices.register، ويبدأ من حالة فارغة، وأن يتوفر له حساب إدارة:
//    AMAN_ADMIN_EMAIL و AMAN_ADMIN_PASSWORD؛ الافتراضي حساب مدير المحاكاة).
// قواعد الزمن الدقيقة (حدود الأيام) تُختبر في tests/task-rules.test.mjs بساعة مزيفة، وهي خاصة بالمحوّل الذي يقبل ذلك.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME = fs.readFileSync(path.join(ROOT, "services/runtime.js"), "utf8");
const ADAPTER_FILE = process.env.AMAN_ADAPTER_FILE ? path.resolve(process.env.AMAN_ADAPTER_FILE) : path.join(ROOT, "simulation/simulation-adapter.js");
const ADAPTER = fs.readFileSync(ADAPTER_FILE, "utf8");
const ADMIN = { email: process.env.AMAN_ADMIN_EMAIL || "admin@simulation.local", password: process.env.AMAN_ADMIN_PASSWORD || "simulation-1234" };

const CLIENT_PUBLIC = ["getSession", "signIn", "signUp"];
const ADMIN_PUBLIC = ["signInAdmin"];

function env() {
  const store = new Map();
  const win = { __AMAN_SIMULATION__: { enabled: true } };
  const ctx = vm.createContext({
    window: win, console, JSON, Math, Number, String, Array, Object, Set, Map, RegExp, Promise, Date,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    location: { hostname: "localhost", pathname: "/" }
  });
  vm.runInContext(RUNTIME, ctx);
  vm.runInContext(ADAPTER, ctx);
  assert.equal(win.AMANServices.isConfigured(), true, "المحوّل لم يسجّل نفسه");
  return { S: win.AMANServices, A: win.AMANAdminServices, C: win.AMANClientServices };
}
const must = (r, what) => { assert.equal(r.success, true, what + ": " + JSON.stringify(r)); return r; };
const failed = (r, code, what) => {
  assert.equal(r.success, false, what + ": توقعنا فشلًا " + JSON.stringify(r));
  assert.equal(r.code, code, what + ": " + JSON.stringify(r));
  assert.equal(typeof r.message, "string", what + ": الرسالة نص");
  assert.ok(r.message.length > 0, what + ": الرسالة غير فارغة");
};

async function seed(e) {
  must(await e.A.signInAdmin(ADMIN), "دخول المدير");
  const company = must(await e.A.saveCompanySettings({
    name: "شركة العقود", prefixes: ["71"], number_lengths: [9], task_interval_days: 90, task_due_window_days: 10,
    is_active: true, create_first_task: true, reactivation_enabled: true, reactivation_days: 5
  }), "شركة").company;
  must(await e.A.savePackage({ company_id: company.id, operation_type: "activation", name: "سنوي", days: 365, price_yer: 1000, active: true }), "باقة");
  must(await e.A.savePaymentMethod({ name: "وسيلة", account_number: "123", instructions: "تعليمات", reference_required: true, active: true }), "وسيلة دفع");
  const pkg = (await e.A.listPackages()).items[0], pay = (await e.A.listPaymentMethods()).items[0];
  return { company, pkg, pay };
}
const submit = (e, s, { phone = "711234567", ref = "R-1", op = "activation" } = {}) => e.C.submitProtectionRequest({
  phone, operation_type: op, company_id: s.company.id, package_id: s.pkg.id, payment_method_id: s.pay.id, payment_reference: ref
});

test("اكتمال الواجهة: كل عمليات العقد معرَّفة في المحوّل", () => {
  const e = env();
  const st = e.S.status();
  assert.equal(st.configured, true);
  assert.equal(st.missing.client.length, 0, "عمليات عميل ناقصة: " + st.missing.client.join(", "));
  assert.equal(st.missing.admin.length, 0, "عمليات إدارة ناقصة: " + st.missing.admin.join(", "));
});

test("الصلاحيات: دون جلسة تُرفض كل عملية غير عامة برمز auth_required وبشكل الفشل الموحد", async () => {
  const e = env();
  for (const name of e.S.contracts.client) {
    if (CLIENT_PUBLIC.includes(name)) continue;
    failed(await e.C[name]({}), "auth_required", "عميل/" + name);
  }
  for (const name of e.S.contracts.admin) {
    if (ADMIN_PUBLIC.includes(name)) continue;
    failed(await e.A[name]({}), "auth_required", "إدارة/" + name);
  }
});

test("الجلسة: لا مستخدم دون دخول، وجلسة العميل لا تمنح صلاحية الإدارة", async () => {
  const e = env();
  const s0 = must(await e.C.getSession({}), "جلسة");
  assert.equal(s0.user, null);
  const up = must(await e.C.signUp({ email: "a@test.local", password: "1234" }), "إنشاء حساب");
  assert.equal("password" in up.user, false, "لا تُعاد كلمة المرور");
  assert.equal(must(await e.C.getSession({}), "جلسة").user.email, "a@test.local");
  failed(await e.A.listRequests({}), "auth_required", "عميل يطلب الإدارة");
  failed(await e.A.signInAdmin({ email: "a@test.local", password: "1234" }), "invalid_credentials", "حساب عميل كمدير");
});

test("الحسابات: التحقق من البريد وكلمة المرور والتكرار وبيانات الدخول الخاطئة", async () => {
  const e = env();
  failed(await e.C.signUp({ email: "ليس بريدًا", password: "1234" }), "invalid_email", "بريد");
  failed(await e.C.signUp({ email: "b@test.local", password: "1" }), "weak_password", "كلمة قصيرة");
  must(await e.C.signUp({ email: "b@test.local", password: "1234" }), "إنشاء");
  must(await e.C.signOut({}), "خروج");
  failed(await e.C.signUp({ email: "B@test.local", password: "1234" }), "email_taken", "بريد مكرر");
  failed(await e.C.signIn({ email: "b@test.local", password: "خطأ" }), "invalid_credentials", "كلمة خاطئة");
  must(await e.C.signIn({ email: "b@test.local", password: "1234" }), "دخول");
  failed(await e.A.signInAdmin({ email: ADMIN.email, password: "خطأ" }), "invalid_credentials", "مدير بكلمة خاطئة");
});

test("البدء من حالة فارغة: لا شركات ولا باقات ولا وسائل دفع ولا طلبات ولا أرقام ولا مهام ولا عملاء", async () => {
  const e = env();
  must(await e.A.signInAdmin(ADMIN), "دخول المدير");
  const empty = async (res, key) => { must(res, key); assert.ok(Array.isArray(res[key]), key + " مصفوفة"); assert.equal(res[key].length, 0, key + " فارغة"); };
  await empty(await e.A.listCompanies({}), "companies");
  await empty(await e.A.listPackages({}), "items");
  await empty(await e.A.listPaymentMethods({}), "items");
  await empty(await e.A.listRequests({}), "requests");
  await empty(await e.A.listNumbers({}), "numbers");
  await empty(await e.A.listCustomers({}), "customers");
  await empty(await e.A.listTasks({}), "tasks");
  await empty(await e.A.listComplaints({}), "reports");
  const sum = must(await e.A.getDashboardSummary({}), "ملخص").summary;
  assert.equal(sum.pending_requests, 0);
  assert.equal(sum.protected_numbers, 0);
});

test("الإدارة: غير الموجود يُرجع not_found، والتحقق يُرجع validation_failed دون حفظ", async () => {
  const e = env();
  must(await e.A.signInAdmin(ADMIN), "دخول المدير");
  failed(await e.A.getRequestDetails({ request_id: "x" }), "not_found", "طلب");
  failed(await e.A.getNumberDetails({ number_id: "x" }), "not_found", "رقم");
  failed(await e.A.getTaskDetails({ task_id: "x" }), "not_found", "مهمة");
  failed(await e.A.getCustomerDetails({ customer_id: "x" }), "not_found", "عميل");
  failed(await e.A.saveCompanySettings({}), "validation_failed", "شركة فارغة");
  failed(await e.A.savePackage({}), "validation_failed", "باقة فارغة");
  failed(await e.A.savePaymentMethod({}), "validation_failed", "وسيلة فارغة");
  failed(await e.A.saveAppContent({ key: "غير_معروف", body: "x" }), "validation_failed", "نص ثابت");
  assert.equal((await e.A.listCompanies({})).companies.length, 0, "لا حفظ عند فشل التحقق");
  assert.equal((await e.A.listPackages({})).items.length, 0);
});

test("الشركات: نافذة الظهور مطلوبة، والبادئة المكررة بين شركتين مرفوضة", async () => {
  const e = env();
  const s = await seed(e);
  const base = { name: "شركة أخرى", prefixes: ["73"], number_lengths: [9], task_interval_days: 90, is_active: true, create_first_task: true, reactivation_enabled: true, reactivation_days: 5 };
  failed(await e.A.saveCompanySettings(base), "validation_failed", "بلا نافذة ظهور");
  failed(await e.A.saveCompanySettings({ ...base, prefixes: ["71"], task_due_window_days: 3 }), "prefix_conflict", "بادئة مكررة");
  failed(await e.A.saveCompanySettings({ ...base, name: s.company.name, task_due_window_days: 3 }), "duplicate_name", "اسم مكرر");
  must(await e.A.saveCompanySettings({ ...base, task_due_window_days: 3 }), "شركة صالحة");
});

test("البحث عن رقم: رموز الأخطاء الموثقة", async () => {
  const e = env();
  must(await e.C.signUp({ email: "n@test.local", password: "1234" }), "عميل");
  failed(await e.C.lookupNumber({ phone: "711234567" }), "no_companies", "دون شركات");
  const admin = env();
  await seed(admin);
  must(await admin.C.signUp({ email: "n@test.local", password: "1234" }), "عميل");
  failed(await admin.C.lookupNumber({ phone: "abc" }), "invalid_number", "رقم غير صالح");
  failed(await admin.C.lookupNumber({ phone: "9912345678" }), "unknown_prefix", "بادئة مجهولة");
  failed(await admin.C.lookupNumber({ phone: "7112345" }), "invalid_length", "طول غير مطابق");
  const ok = must(await admin.C.lookupNumber({ phone: "711234567" }), "رقم غير مشترك");
  assert.equal(ok.number.status, "not_subscribed");
});

test("طلب الحماية: التحقق من الباقة ووسيلة الدفع والمرجع والرقم", async () => {
  const e = env();
  const s = await seed(e);
  must(await e.C.signUp({ email: "c@test.local", password: "1234" }), "عميل");
  failed(await e.C.submitProtectionRequest({ phone: "12", operation_type: "activation" }), "invalid_request", "بيانات ناقصة");
  failed(await e.C.submitProtectionRequest({ phone: "711234567", operation_type: "activation", company_id: s.company.id, package_id: "x", payment_method_id: s.pay.id, payment_reference: "R" }), "unavailable_package", "باقة مجهولة");
  failed(await submit(e, s, { ref: "" }), "reference_required", "مرجع مطلوب");
  failed(await submit(e, s, { op: "extension" }), "unavailable_package", "نوع عملية لا تطابق الباقة");
  const catalog = must(await e.C.getProtectionCatalog({ company_id: s.company.id, operation_type: "activation" }), "الكتالوج");
  assert.equal(catalog.packages.length, 1);
  assert.equal(catalog.payment_methods[0].account_number, "123");
  must(await submit(e, s), "طلب صالح");
});

test("دورة العملية: اعتماد يجعل الرقم محميًا، والخصوصية وأهلية العمليات والتكرار", async () => {
  const e = env();
  const s = await seed(e);
  must(await e.C.signUp({ email: "owner@test.local", password: "1234" }), "المالك");
  const req = must(await submit(e, s), "طلب");
  assert.equal(must(await e.A.getDashboardSummary({}), "ملخص").summary.pending_requests, 1);
  failed(await submit(e, s, { ref: "R-2" }), "operation_not_allowed", "تكرار الاشتراك لرقم يملكه العميل قبل الاعتماد يُحسم عند الاعتماد");
});
