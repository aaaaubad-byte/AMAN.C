// اختبارات سلوكية لقاعدة المصادرة والمهام (docs/DECISIONS.md: D2/D4/D5/D6 + توضيحات 2026-11-01).
// تحمّل محوّل المحاكاة في بيئة vm معزولة بساعة قابلة للتحكم، وتستدعي عقود الخدمات كما تفعل الواجهات.
// التقويم ميلادي وتوقيت Asia/Aden (UTC+3).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const CODE = fs.readFileSync(new URL("../simulation/simulation-adapter.js", import.meta.url), "utf8");
const ADMIN = { email: "admin@simulation.local", password: "simulation-1234" };

function setup(startIso = "2026-01-01T09:00:00+03:00", { windowDays } = {}) {
  let current = Date.parse(startIso);
  class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(current); }
    static now() { return current; }
  }
  const store = new Map();
  let services = null;
  const ctx = vm.createContext({
    Date: FakeDate, console, JSON, Math, Number, String, Array, Object, Set, Map, RegExp, Promise,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    location: { hostname: "localhost", pathname: "/" },
    window: { __AMAN_SIMULATION__: { enabled: true }, AMANServices: { register: s => { services = s; } } }
  });
  vm.runInContext(CODE, ctx);
  assert.ok(services, "لم يُسجَّل محوّل المحاكاة");
  const { admin, client } = services;
  const setNow = iso => { current = Date.parse(iso); };
  const must = (res, what) => { assert.equal(res.success, true, what + ": " + JSON.stringify(res)); return res; };

  must(admin.signInAdmin(ADMIN), "دخول المدير");
  const companyInput = {
    name: "شركة اختبار", prefixes: ["71"], number_lengths: [9], task_interval_days: 90,
    is_active: true, create_first_task: true, reactivation_enabled: true, reactivation_days: 5
  };
  if (windowDays !== undefined) companyInput.task_due_window_days = windowDays;
  const company = must(admin.saveCompanySettings(companyInput), "إضافة شركة").company;
  const pkgs = {};
  [["act365", "activation", 365], ["act30", "activation", 30], ["react30", "reactivation", 30]].forEach(([k, op, days]) => {
    admin.savePackage({ company_id: company.id, operation_type: op, name: k, days, price_yer: 1000, active: true });
  });
  admin.listPackages().items.forEach(p => { pkgs[p.name] = p.id; });
  must(admin.savePaymentMethod({ name: "وسيلة اختبار", instructions: "تعليمات", reference_required: true }), "وسيلة دفع");
  const pay = admin.listPaymentMethods().items[0];
  must(client.signUp({ email: "c@test.local", password: "1234" }), "إنشاء حساب عميل");

  const request = (op, pkg, phone) => client.submitProtectionRequest({
    phone, operation_type: op, company_id: company.id, package_id: pkgs[pkg], payment_method_id: pay.id, payment_reference: "REF-" + Math.random()
  });
  const runOp = (op, pkg, phone = "711234567") => {
    const r = must(request(op, pkg, phone), "طلب " + op);
    must(admin.approveRequest({ request_id: r.request_id }), "اعتماد " + op);
  };
  const tasks = () => admin.listTasks().tasks;
  const pending = () => tasks().find(t => t.status !== "executed");
  const numStatus = () => client.listMyNumbers().items[0].status;
  return { admin, client, company, setNow, must, request, runOp, tasks, pending, numStatus };
}

// 04-01 00:00 بتوقيت عدن = 03-31T21:00Z
test("اشتراك جديد: المهمة الأولى = يوم الاعتماد + الفاصل (90 يومًا)", () => {
  const s = setup();
  s.runOp("activation", "act365");
  const t = s.tasks();
  assert.equal(t.length, 1);
  assert.equal(t[0].due_at, "2026-03-31T21:00:00.000Z");
  assert.equal(t[0].status, "planned");
});

test("التنفيذ داخل الفاصل جائز مبكرًا: تُسجَّل مكتملة والتالية = يوم التنفيذ + الفاصل", () => {
  const s = setup();
  s.runOp("activation", "act365");
  s.setNow("2026-02-10T10:00:00+03:00");
  const first = s.pending();
  assert.equal(first.status, "planned"); // قبل الموعد وخارج نافذة الظهور (الافتراضي 0)
  s.must(s.admin.executeTask({ task_id: first.id }), "تنفيذ مبكر");
  const open = s.tasks().filter(t => t.status !== "executed");
  assert.equal(open.length, 1);
  assert.equal(open[0].due_at, "2026-05-10T21:00:00.000Z"); // 05-11 بتوقيت عدن = 02-10 + 90
  assert.equal(s.tasks().filter(t => t.status === "executed").length, 1);
  assert.notEqual(open[0].id, first.id);
});

test("التنفيذ في يوم الموعد يعيد الحساب من يوم التنفيذ، ولا تبقى مهمة غير منفذة قديمة", () => {
  const s = setup();
  s.runOp("activation", "act365");
  s.setNow("2026-04-01T10:00:00+03:00");
  const first = s.pending();
  assert.equal(first.status, "due");
  s.must(s.admin.executeTask({ task_id: first.id }), "تنفيذ");
  const open = s.tasks().filter(t => t.status !== "executed");
  assert.equal(open.length, 1);
  assert.equal(open[0].due_at, "2026-06-29T21:00:00.000Z"); // 06-30 بتوقيت عدن
});

test("نافذة الظهور: تظهر المهمة «مستحقة» قبل موعدها بعدد الأيام المحدد فقط", () => {
  const s = setup("2026-01-01T09:00:00+03:00", { windowDays: 10 });
  s.runOp("activation", "act365"); // الموعد 04-01
  s.setNow("2026-03-21T10:00:00+03:00"); // قبل الموعد بـ 11 يومًا
  assert.equal(s.pending().status, "planned");
  assert.equal(s.admin.getDashboardSummary().summary.due_tasks, 0);
  s.setNow("2026-03-22T00:00:01+03:00"); // قبل الموعد بـ 10 أيام
  assert.equal(s.pending().status, "due");
  assert.equal(s.admin.getDashboardSummary().summary.due_tasks, 1);
  assert.equal(s.pending().due_window_days, 10);
});

test("نافذة الظهور لا تغيّر تاريخ المصادرة (يبقى آخر يوم في الفاصل)", () => {
  const s = setup("2026-01-01T09:00:00+03:00", { windowDays: 10 });
  s.runOp("activation", "act365");
  s.setNow("2026-04-01T23:59:59+03:00");
  assert.equal(s.numStatus(), "protected");
  s.setNow("2026-04-02T00:00:00+03:00");
  assert.equal(s.numStatus(), "confiscated");
});

test("التحقق من نافذة الظهور: سالبة مرفوضة، وغيابها في التعديل يُبقي القيمة الحالية", () => {
  const s = setup("2026-01-01T09:00:00+03:00", { windowDays: 7 });
  const base = { id: s.company.id, name: "شركة اختبار", prefixes: ["71"], number_lengths: [9], task_interval_days: 90, is_active: true, create_first_task: true, reactivation_enabled: true, reactivation_days: 5 };
  const bad = s.admin.saveCompanySettings({ ...base, task_due_window_days: -1 });
  assert.equal(bad.success, false);
  assert.equal(bad.code, "validation_failed");
  s.must(s.admin.saveCompanySettings(base), "حفظ دون نافذة");
  assert.equal(s.admin.listCompanies().companies[0].task_due_window_days, 7);
});

test("تجاوز تاريخ المصادرة دون تنفيذ ← الرقم مصادَر؛ وقبل انتهاء اليوم لا يزال محميًا", () => {
  const s = setup();
  s.runOp("activation", "act365");
  s.setNow("2026-04-01T23:59:59+03:00");
  assert.equal(s.numStatus(), "protected");
  s.setNow("2026-04-02T00:00:00+03:00");
  assert.equal(s.numStatus(), "confiscated");
});

test("إعادة الجدولة بالزيادة تؤجل المصادرة وتزيح القادمة بالمقدار نفسه", () => {
  const s = setup();
  s.runOp("activation", "act365");
  s.setNow("2026-03-20T10:00:00+03:00");
  const t = s.pending();
  const prev = s.must(s.admin.previewTaskReschedule({ task_id: t.id, new_due_at: "2026-04-11" }), "معاينة");
  assert.ok(prev.affected_count >= 2);
  s.must(s.admin.rescheduleTask({ task_id: t.id, new_due_at: "2026-04-11" }), "إعادة جدولة");
  assert.equal(s.pending().due_at, "2026-04-10T21:00:00.000Z"); // 04-11 بتوقيت عدن
  s.setNow("2026-04-05T10:00:00+03:00");
  assert.equal(s.numStatus(), "protected"); // كان سيُصادَر لولا إعادة الجدولة؟ لا: 04-05 بعد الموعد الأصلي
  s.setNow("2026-04-11T10:00:00+03:00");
  s.must(s.admin.executeTask({ task_id: s.pending().id }), "تنفيذ");
  assert.equal(s.pending().due_at, "2026-07-09T21:00:00.000Z"); // 07-10 بتوقيت عدن
});

test("إعادة الجدولة بالنقصان جائزة ما لم تسبق اليوم", () => {
  const s = setup();
  s.runOp("activation", "act365");
  s.setNow("2026-03-01T10:00:00+03:00");
  const t = s.pending();
  s.must(s.admin.rescheduleTask({ task_id: t.id, new_due_at: "2026-03-10" }), "تقديم الموعد");
  assert.equal(s.pending().due_at, "2026-03-09T21:00:00.000Z"); // 03-10 بتوقيت عدن
  s.setNow("2026-03-11T00:00:00+03:00");
  assert.equal(s.numStatus(), "confiscated"); // الموعد الجديد فاته
});

test("لا إعادة جدولة إلى تاريخ سابق لليوم", () => {
  const s = setup();
  s.runOp("activation", "act365");
  s.setNow("2026-03-20T10:00:00+03:00");
  const res = s.admin.rescheduleTask({ task_id: s.pending().id, new_due_at: "2026-03-01" });
  assert.equal(res.success, false);
  assert.equal(res.code, "invalid_date");
});

test("D6: التنشيط قبل تاريخ المصادرة يستكمل المخطط نفسه دون مهمة جديدة", () => {
  const s = setup();
  s.runOp("activation", "act30"); // الحماية حتى 01-31، موعد المهمة 04-01
  const before = s.pending();
  s.setNow("2026-02-15T10:00:00+03:00");
  assert.equal(s.numStatus(), "inactive");
  s.runOp("reactivation", "react30");
  assert.equal(s.numStatus(), "protected");
  const after = s.tasks();
  assert.equal(after.length, 1);
  assert.equal(after[0].id, before.id);
  assert.equal(after[0].due_at, before.due_at);
});

test("D6: التنشيط بعد تجاوز تاريخ المصادرة مرفوض", () => {
  const s = setup();
  s.runOp("activation", "act30");
  s.setNow("2026-04-02T10:00:00+03:00");
  assert.equal(s.numStatus(), "confiscated");
  const res = s.request("reactivation", "react30", "711234567");
  assert.equal(res.success, false);
  assert.equal(res.code, "operation_not_allowed");
});

test("D5: لا تنفيذ للمهمة بعد انتهاء الاشتراك (الرقم غير نشط)", () => {
  const s = setup();
  s.runOp("activation", "act30");
  s.setNow("2026-04-01T10:00:00+03:00"); // يوم الموعد، والاشتراك منتهٍ، ولم يُصادَر بعد
  assert.equal(s.numStatus(), "inactive");
  const res = s.admin.executeTask({ task_id: s.pending().id });
  assert.equal(res.success, false);
  assert.equal(res.code, "task_not_executable");
});
