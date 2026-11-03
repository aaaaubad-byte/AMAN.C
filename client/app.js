/*
 * AMAN.C — تطبيق العميل
 * يتعامل مع البيانات عبر window.AMANClientServices فقط (services/runtime.js).
 * لا يقرأ localStorage ولا يحتوي بيانات ثابتة ولا يعرض نجاحًا قبل تأكيد الخدمة.
 *
 * D3 (docs/DECISIONS.md): شاشتا تسجيل الدخول وإنشاء الحساب، وحارس جلسة: لا رئيسية ولا شاشة داخلية دون جلسة.
 * الشاشات العامة (boot/login/signup) هي الوحيدة المتاحة بلا جلسة، وأي محاولة تنقل لغيرها تُحوَّل إلى تسجيل الدخول.
 * فقدان الجلسة أثناء الاستخدام (auth_required من أي عملية) يعيد المستخدم إلى تسجيل الدخول برسالة واضحة.
 */
(() => {
"use strict";

const $ = id => document.getElementById(id);
/* واجهة الخدمات مع كشف انتهاء الجلسة: تُقرأ من window في كل استدعاء ليتسنى استبدالها في الاختبارات. */
const AUTH_EXEMPT = new Set(["getSession", "signIn", "signUp", "signOut"]);
const svc = () => {
 const raw = window.AMANClientServices, out = {};
 Object.keys(raw).forEach(name => {
  out[name] = async payload => {
   const result = await raw[name](payload);
   if (result && result.success !== true && result.code === "auth_required" && !AUTH_EXEMPT.has(name)) sessionLost();
   return result;
  };
 });
 return out;
};
const runtime = () => window.AMANServices;
const fmt = value => runtime().formatDateTime(value);

const screenIds = ["boot", "login", "signup", "home", "numbers", "operations", "operation-detail", "protection", "review", "result", "account", "notifications", "number-alerts", "report"];
const PUBLIC_SCREENS = new Set(["boot", "login", "signup"]);
const screens = Object.fromEntries(screenIds.map(id => [id, $(id + "-screen")]));
const tabs = [...document.querySelectorAll("[data-tab]")];
const numberSheet = $("number-sheet");
const tabForScreen = { home: "home", numbers: "numbers", operations: "operations" };

const numberStatusLabels = { protected: "محمي", inactive: "غير نشط", confiscated: "منتهي-مصادر", not_subscribed: "غير مشترك", other_protected: "محمي" };
const stateClass = { protected: "state-active", inactive: "state-wait", confiscated: "state-expired", not_subscribed: "state-off", other_protected: "state-active" };
const requestStatusLabels = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const operationLabels = { activation: "اشتراك", extension: "تمديد الاشتراك", reactivation: "تنشيط" };
const accountTypeLabels = { user: "مستخدم", customer: "عميل" };

/* ---------- الحالة ---------- */
let currentScreen = "boot", previousScreen = "home";
let session = null;
const lists = {
 numbers: { state: "idle", items: [], message: "" },
 operations: { state: "idle", items: [], message: "" },
 notifications: { state: "idle", items: [], message: "" }
};
let lastNumber = null, lastNumberSource = "home";
let protectionContext = null, protectionCatalog = { packages: [], payment_methods: [] }, protectionSubmitting = false;
let alertsToken = 0, searchToken = 0;
let reportNumber = null, reportSubmitting = false;

/* ---------- أدوات ---------- */
const normalizeDigits = value => String(value ?? "").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const normalizePhone = value => normalizeDigits(value).replace(/[^0-9]/g, "");
const has = value => value !== null && value !== undefined && value !== "";
/* جدول أيقونات SVG ثابتة داخلية (ليست من بيانات المستخدم) */
const svgIcon = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
const ICONS = {
 clock: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 user: svgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
 alert: svgIcon('<path d="M12 3 2 20h20zM12 10v5M12 18h.01"/>'),
 phone: svgIcon('<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M9 6h6M9 10h2m3 0h1M9 14h2m3 0h1m-5 4h2"/>'),
 search: svgIcon('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
 bell: svgIcon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>')
};
function el(tag, cls, content) { const n = document.createElement(tag); if (cls) n.className = cls; if (content !== undefined) n.textContent = content; return n; }
function iconEl(cls, name) { const n = el("span", cls); n.innerHTML = ICONS[name] || ""; return n; }
function setMessage(node, message, kind = "error") { if (!node) return; node.textContent = message; node.className = kind === "success" ? "notice-success" : kind === "info" ? "notice-info" : "notice-error"; }
function detailBlock(label, value, dir) { const b = el("div", "detail-block"), l = el("div", "detail-label", label), v = el("div", "detail-value", value); if (dir) v.dir = dir; b.append(l, v); return b; }
function emptyBox(icon, title, text, action) {
 const box = el("div", "soft-surface empty-state");
 const ic = el("div", "empty-icon"); ic.innerHTML = ICONS[icon] || "";
 box.append(ic, el("strong", "", title));
 if (text) box.append(el("p", "", text));
 if (action) { const b = el("button", "btn btn-outline", action.label); b.type = "button"; b.addEventListener("click", action.run); box.append(b); }
 return box;
}
function serviceProblem(result) { return result && result.message ? result.message : "تعذر إتمام العملية."; }

/* ---------- التنقل وحارس الجلسة (D3) ---------- */
function renderAuthFoot() {
 const st = runtime().status();
 const text = !st.configured ? runtime().notConfiguredMessage : st.simulation ? "وضع المحاكاة: لا تُدخل بياناتك الحقيقية." : "";
 $("login-foot").textContent = text; $("signup-foot").textContent = text;
}
function navigate(name, { scroll = true, remember = true } = {}) {
 if (!screens[name]) return false;
 /* الحارس: بلا جلسة لا شاشة غير عامة؛ ومع جلسة لا عودة لشاشات الدخول. */
 if (!session && !PUBLIC_SCREENS.has(name)) name = "login";
 else if (session && PUBLIC_SCREENS.has(name)) name = "home";
 if (remember && name !== currentScreen) previousScreen = currentScreen;
 currentScreen = name;
 Object.entries(screens).forEach(([key, node]) => { if (node) node.hidden = key !== name; });
 const bare = PUBLIC_SCREENS.has(name);
 $("topbar-actions").style.display = bare ? "none" : "";
 $("bottom-nav").style.display = bare ? "none" : "";
 if (name === "login" || name === "signup") renderAuthFoot();
 tabs.forEach(node => node.classList.toggle("active", node.dataset.tab === tabForScreen[name]));
 closeNumberSheet();
 if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
 /* تحديث هادئ للقوائم عند الدخول إلى شاشاتها لتعكس ما اعتمدته الإدارة منذ آخر تحميل. */
 if (session) {
  if (name === "home" || name === "numbers") refreshNumbers(true);
  if (name === "operations") refreshOperations(true);
  if (name === "notifications") refreshNotifications(true);
 }
 document.dispatchEvent(new CustomEvent("aman:screenchange", { detail: { screen: name, previous: previousScreen } }));
 return true;
}
function backToPrevious() { navigate(previousScreen || "home", { remember: false }); }
function returnToNumber() { if (lastNumber) openNumberDetails(lastNumber, lastNumberSource); else navigate(lastNumberSource || "home", { remember: false }); }
window.AMANClientNavigation = Object.freeze({ navigate, back: backToPrevious, get current() { return currentScreen; }, get previous() { return previousScreen; } });

function clearPrivateState() {
 lastNumber = null; protectionContext = null; reportNumber = null; alertsToken++; searchToken++;
 closeNumberSheet();
 ["login-password", "signup-password", "signup-confirm", "current-password", "new-password", "payment-reference", "phone-search"].forEach(id => { const n = $(id); if (n) n.value = ""; });
 $("search-message").textContent = "";
}
function showLogin(message, kind = "info") {
 clearPrivateState();
 setMessage($("login-message"), message || "", kind);
 navigate("login");
}
function sessionLost() {
 if (!session) return;
 session = null;
 resetLists("");
 Object.values(lists).forEach(l => { l.state = "signedout"; });
 renderAccount(); renderAll();
 showLogin("انتهت الجلسة. سجّل الدخول من جديد.", "error");
}

tabs.forEach(node => node.addEventListener("click", () => navigate(node.dataset.tab)));
document.querySelectorAll("[data-navigate]").forEach(node => node.addEventListener("click", () => navigate(node.dataset.navigate)));
document.querySelectorAll("[data-back]").forEach(node => node.addEventListener("click", backToPrevious));
document.querySelectorAll("[data-back-number]").forEach(node => node.addEventListener("click", returnToNumber));
$("show-all-numbers").addEventListener("click", () => navigate("numbers"));
$("account-button").addEventListener("click", () => { renderAccount(); navigate("account"); });
$("notifications-button").addEventListener("click", () => navigate("notifications"));
document.querySelector(".brand").addEventListener("click", event => { event.preventDefault(); navigate("home"); });

function closeNumberSheet() { if (numberSheet) numberSheet.hidden = true; }
$("close-sheet").addEventListener("click", closeNumberSheet);
$("sheet-done").addEventListener("click", closeNumberSheet);
numberSheet.addEventListener("click", event => { if (event.target === numberSheet) closeNumberSheet(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeNumberSheet(); });

/* ---------- تحميل البيانات من الخدمات ---------- */
function resetLists(message) {
 Object.values(lists).forEach(l => { l.state = "idle"; l.items = []; l.message = message || ""; });
}
/* silent: إن كانت القائمة محمّلة فلا نعرض «جارٍ التحميل» أثناء التحديث؛ الفشل يظهر دائمًا ولا تبقى بيانات قديمة. */
async function loadList(name, call, silent = false) {
 const list = lists[name];
 if (!(silent && list.state === "ready")) { list.state = "loading"; list.message = ""; renderAll(); }
 const result = await call();
 if (!session) return;
 if (result.success === true) { list.items = Array.isArray(result.items) ? result.items : []; list.state = "ready"; list.message = ""; }
 else { list.items = []; list.state = result.code === "auth_required" ? "signedout" : "error"; list.message = serviceProblem(result); }
 renderAll();
}
const refreshNumbers = silent => loadList("numbers", () => svc().listMyNumbers(), silent === true);
const refreshOperations = silent => loadList("operations", () => svc().listMyOperations(), silent === true);
const refreshNotifications = silent => loadList("notifications", () => svc().getNotifications(), silent === true);

/* يحدد الجلسة الحالية؛ لا ينتظر القوائم (تعرض حالة التحميل بنفسها). يُرجع نتيجة الخدمة. */
async function loadSession() {
 const result = await svc().getSession();
 if (result.success === true && result.user) {
  session = result.user;
  renderAccount();
  refreshNumbers(); refreshOperations(); refreshNotifications();
 } else {
  session = null;
  resetLists(result.success === true ? "" : serviceProblem(result));
  Object.values(lists).forEach(l => { l.state = result.success === true ? "signedout" : "error"; });
  renderAccount(); renderAll();
 }
 return result;
}

/* ---------- حالات القوائم المشتركة ---------- */
function listStateBox(name, retry, emptyTitle, emptyText) {
 const list = lists[name];
 if (list.state === "loading") return emptyBox("clock", "جارٍ التحميل…");
 if (list.state === "signedout") return emptyBox("user", "سجّل الدخول للمتابعة", "تظهر بياناتك بعد تسجيل الدخول.", { label: "تسجيل الدخول", run: () => showLogin() });
 if (list.state === "error") return emptyBox("alert", "تعذر تحميل البيانات", list.message, { label: "إعادة المحاولة", run: retry });
 if (list.state === "idle") return emptyBox("clock", "جارٍ التحضير…");
 if (!list.items.length) return emptyBox("phone", emptyTitle, emptyText);
 return null;
}

/* ---------- الأرقام ---------- */
function numberCard(item, source) {
 const b = el("button", "phone-card"); b.type = "button";
 const info = el("span", "phone-info"), phone = el("strong", "", item.phone); phone.dir = "ltr";
 const meta = [item.company, item.remaining_label || (item.ends_at ? "ينتهي " + fmt(item.ends_at) : "")].filter(Boolean).join(" · ");
 info.append(phone, el("small", "", meta));
 b.append(iconEl("phone-icon", "phone"), info, el("span", "state " + (stateClass[item.status] || "state-off"), numberStatusLabels[item.status] || "—"));
 b.addEventListener("click", () => openNumberDetails(item, source));
 return b;
}
function renderHomeNumbers() {
 const host = $("my-numbers"); host.replaceChildren();
 const box = listStateBox("numbers", () => refreshNumbers(), "لا توجد أرقام مرتبطة بحسابك", "ستظهر أرقامك هنا بعد اعتماد طلب الاشتراك من إدارة أمان.");
 if (box) host.append(box); else lists.numbers.items.slice(0, 3).forEach(n => host.append(numberCard(n, "home")));
}
function renderNumbers() {
 const host = $("numbers-list"); host.replaceChildren();
 const box = listStateBox("numbers", () => refreshNumbers(), "لا توجد أرقام بعد", "تظهر هنا الأرقام بعد اعتماد طلب الاشتراك. البحث عن رقم لا يضيفه إلى قائمتك.");
 if (box) { host.append(box); updateCompanyFilter(); return; }
 const query = normalizePhone($("numbers-search").value), company = $("numbers-company-filter").value, status = $("numbers-status-filter").value;
 const filtered = lists.numbers.items.filter(i => (!query || normalizePhone(i.phone).includes(query)) && (!company || i.company_id === company) && (!status || i.status === status));
 if (!filtered.length) { host.append(emptyBox("search", "لا توجد نتائج مطابقة", "غيّر عبارة البحث أو خيارات التصفية.")); updateCompanyFilter(); return; }
 filtered.forEach(n => host.append(numberCard(n, "numbers")));
 updateCompanyFilter();
}
function updateCompanyFilter() {
 const select = $("numbers-company-filter"), current = select.value;
 const companies = [...new Map(lists.numbers.items.filter(n => n.company_id && n.company).map(n => [n.company_id, n.company])).entries()];
 select.replaceChildren(new Option("كل الشركات", ""));
 companies.forEach(([id, name]) => select.add(new Option(name, id)));
 if (companies.some(([id]) => id === current)) select.value = current;
}
["numbers-search", "numbers-company-filter", "numbers-status-filter"].forEach(id => $(id).addEventListener("input", renderNumbers));
$("clear-numbers-search").addEventListener("click", () => { $("numbers-search").value = ""; renderNumbers(); $("numbers-search").focus(); });

/* ---------- تفاصيل الرقم: النماذج الخمسة وفق مصفوفة الإجراءات (مرجع العميل 6) ---------- */
function openNumberDetails(number, source = "numbers") {
 if (!number || !number.phone) return false;
 lastNumber = number; lastNumberSource = source; previousScreen = source;
 const status = number.status;
 $("sheet-title").textContent = "تفاصيل الرقم";
 $("sheet-phone").textContent = number.phone;
 const badge = numberSheet.querySelector(".state");
 badge.textContent = numberStatusLabels[status] || "غير متاح";
 badge.className = "state " + (stateClass[status] || "state-off");
 const rows = [["شركة الاتصالات", number.company]];
 if (status === "protected") rows.push(["باقة الحماية", number.package_name], ["مدة الحماية", number.duration_days ? number.duration_days + " يوم" : null], ["بداية الحماية", fmt(number.starts_at)], ["نهاية الحماية", fmt(number.ends_at)], ["المدة المتبقية", number.remaining_label]);
 if (status === "inactive" || status === "confiscated") rows.push(["الباقة السابقة", number.package_name], ["بداية الفترة السابقة", has(number.starts_at) ? fmt(number.starts_at) : null], ["تاريخ الانتهاء", has(number.ends_at) ? fmt(number.ends_at) : null]);
 if (status === "inactive") rows.push(["آخر يوم للتنشيط", has(number.last_activation_date) ? fmt(number.last_activation_date) : null]);
 const extra = $("sheet-details-extra"); extra.replaceChildren();
 rows.filter(([, v]) => has(v) && v !== "—").forEach(([l, v]) => extra.append(detailBlock(l, v)));
 const notes = {
  not_subscribed: "الرقم غير مشمول حاليًا بحماية أمان.",
  protected: "الرقم مشمول بالحماية لدى حسابك.",
  other_protected: "هذا الرقم محمي حاليًا لدى عميل آخر. لا يمكن الاشتراك فيه من هذا الحساب ولا يمكن عرض أي بيانات تخص ذلك العميل.",
  inactive: "انتهت فترة الحماية السابقة؛ يتاح التنشيط ضمن مهلة التنشيط.",
  confiscated: "انتهت مهلة التنشيط. لا يتاح إجراء التنشيط."
 };
 const privacy = $("sheet-privacy-note"); privacy.hidden = false; privacy.textContent = notes[status] || ""; privacy.hidden = !notes[status];
 const actions = $("sheet-actions"); actions.replaceChildren();
 const add = (label, run, cls = "btn btn-block") => { const b = el("button", cls, label); b.type = "button"; b.addEventListener("click", run); actions.append(b); };
 if (status === "not_subscribed") add(operationLabels.activation, () => openProtection(number, "activation"));
 if (status === "protected") { add(operationLabels.extension, () => openProtection(number, "extension")); add("التنبيهات", () => openNumberAlerts(number), "btn btn-outline btn-block"); }
 if (status === "inactive") { add(operationLabels.reactivation, () => openProtection(number, "reactivation")); add("التنبيهات", () => openNumberAlerts(number), "btn btn-outline btn-block"); }
 if (status === "other_protected") add("تقديم بلاغ", () => openReport(number));
 numberSheet.hidden = false;
 return true;
}

/* ---------- البحث (C-01) ---------- */
$("phone-search").addEventListener("input", event => {
 event.target.value = normalizeDigits(event.target.value).replace(/[^0-9]/g, "");
 $("search-message").textContent = "";
});
$("search-form").addEventListener("submit", async event => {
 event.preventDefault();
 const input = $("phone-search"), message = $("search-message"), submit = event.currentTarget.querySelector('button[type="submit"]');
 const phone = normalizePhone(input.value);
 if (!phone) { setMessage(message, "أدخل رقم الهاتف بصيغته المحلية."); input.focus(); return; }
 if (phone.length < 7 || phone.length > 15) { setMessage(message, "تحقق من طول الرقم المدخل."); input.focus(); return; }
 if (!runtime().isConfigured()) { setMessage(message, runtime().notConfiguredMessage); return; }
 if (!session) { showLogin("سجّل الدخول للبحث عن حالة الرقم."); return; }
 const token = ++searchToken;
 submit.disabled = true; setMessage(message, "جارٍ التحقق من الرقم…", "info");
 const result = await svc().lookupNumber({ phone });
 submit.disabled = false;
 if (token !== searchToken || !session) return;
 if (result.success === true && result.number) { message.textContent = ""; message.className = ""; openNumberDetails(result.number, "home"); return; }
 setMessage(message, serviceProblem(result));
});

/* ---------- العمليات (C-04/C-05) ---------- */
function renderOperations() {
 const host = $("operations-list"); host.replaceChildren();
 const box = listStateBox("operations", () => refreshOperations(), "لا توجد عمليات حتى الآن", "ستظهر طلباتك هنا بعد إرسالها، ولن تبدأ الحماية إلا بعد اعتماد طلب الاشتراك.");
 if (box) { host.append(box); return; }
 const query = normalizeDigits($("operations-search").value).trim(), status = $("operations-status-filter").value;
 const filtered = lists.operations.items.filter(i => (!query || normalizeDigits(i.phone).includes(query) || String(i.request_number || i.id || "").includes(query)) && (!status || i.status === status));
 if (!filtered.length) { host.append(emptyBox("search", "لا توجد نتائج مطابقة", "لا توجد عملية تطابق البحث أو حالة الطلب المحددة.")); return; }
 filtered.forEach(item => {
  const b = el("button", "operation-card"); b.type = "button";
  const main = el("span", "operation-main"), phone = el("small", "", item.phone); phone.dir = "ltr";
  main.append(el("strong", "", operationLabels[item.type] || "عملية حماية"), phone, el("small", "", fmt(item.created_at)));
  const side = el("span", "operation-side");
  side.append(el("b", "state " + (item.status === "approved" ? "state-active" : item.status === "rejected" ? "state-expired" : "state-wait"), requestStatusLabels[item.status] || "—"), el("strong", "", has(item.price_yer) ? Number(item.price_yer).toLocaleString("ar") + " ر.ي" : ""));
  b.append(main, side);
  b.addEventListener("click", () => openOperationDetails(item));
  host.append(b);
 });
}
$("operations-search").addEventListener("input", renderOperations);
$("operations-status-filter").addEventListener("change", renderOperations);

function openOperationDetails(item) {
 if (!item) return false;
 const rows = [["رقم الطلب", item.request_number || item.id], ["نوع العملية", operationLabels[item.type]], ["رقم الهاتف", item.phone, "ltr"], ["شركة الاتصالات", item.company], ["الباقة", item.package_name], ["المدة", item.duration_days ? item.duration_days + " يوم" : null], ["السعر", has(item.price_yer) ? Number(item.price_yer).toLocaleString("ar") + " ر.ي" : null], ["وسيلة الدفع", item.payment_method], ["مرجع الدفع", item.payment_reference, "ltr"], ["تاريخ الطلب", fmt(item.created_at)], ["حالة الطلب", requestStatusLabels[item.status]]];
 if (item.status === "rejected") rows.push(["سبب الرفض", item.rejection_reason], ["توضيح الرفض", item.rejection_note]);
 const content = $("operation-detail-content"); content.replaceChildren();
 rows.filter(([, v]) => has(v)).forEach(([l, v, d]) => content.append(detailBlock(l, v, d)));
 const actions = el("div", "detail-actions");
 [["نسخ رقم الطلب", item.request_number || item.id], ["نسخ مرجع الدفع", item.payment_reference]].filter(p => p[1]).forEach(([label, value]) => {
  const b = el("button", "btn btn-outline", label); b.type = "button";
  b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(String(value)); b.textContent = "تم النسخ"; } catch { b.textContent = "تعذر النسخ"; } });
  actions.append(b);
 });
 content.append(actions);
 navigate("operation-detail");
 return true;
}

/* ---------- الحماية (C-06) والمراجعة (C-07) والنتيجة (C-08) ---------- */
function allowedOperation(number) { return ({ not_subscribed: "activation", protected: "extension", inactive: "reactivation" })[number.status] || null; }
async function openProtection(number, type) {
 if (!number || allowedOperation(number) !== type) return false;
 if (!session) { showLogin(); return false; }
 protectionContext = { phone: number.phone, company: number.company, company_id: number.company_id, type, number };
 $("protection-phone").textContent = number.phone;
 $("protection-company").textContent = number.company || "";
 $("protection-type").textContent = operationLabels[type];
 $("payment-reference").value = ""; $("protection-message").textContent = "";
 populateCatalog({ packages: [], payment_methods: [] });
 $("package-summary").textContent = "جارٍ تحميل الباقات المعتمدة…";
 $("protection-continue").disabled = true;
 navigate("protection");
 const result = await svc().getProtectionCatalog({ company_id: number.company_id, operation_type: type });
 if (!protectionContext || protectionContext.phone !== number.phone) return true;
 if (result.success === true) { protectionCatalog = { packages: result.packages || [], payment_methods: result.payment_methods || [] }; populateCatalog(protectionCatalog); $("protection-continue").disabled = false; }
 else setMessage($("protection-message"), serviceProblem(result));
 return true;
}
function populateCatalog(catalog) {
 protectionCatalog = catalog;
 const ps = $("protection-package"), ms = $("protection-payment");
 const packages = catalog.packages.filter(p => p && p.id && p.name && p.company_id === protectionContext?.company_id && p.operation_type === protectionContext?.type);
 ps.replaceChildren(new Option("اختر الباقة المتاحة", ""));
 packages.forEach(p => ps.add(new Option(p.name + " — " + p.duration_days + " يوم — " + Number(p.price_yer).toLocaleString("ar") + " ر.ي", p.id)));
 ms.replaceChildren(new Option("اختر وسيلة الدفع", ""));
 catalog.payment_methods.forEach(p => ms.add(new Option(p.name, p.id)));
 $("package-summary").textContent = packages.length ? "اختر باقة معتمدة لهذه الشركة ونوع العملية." : "لا توجد باقات معتمدة متاحة حاليًا لهذه الشركة ونوع العملية.";
 $("payment-instructions").textContent = "تعليمات الدفع المعتمدة ستظهر بعد اختيار الوسيلة.";
}
$("protection-package").addEventListener("change", event => {
 const p = protectionCatalog.packages.find(x => x.id === event.target.value);
 $("package-summary").textContent = p ? "المدة: " + p.duration_days + " يوم — السعر: " + Number(p.price_yer).toLocaleString("ar") + " ر.ي" : "اختر الباقة المعتمدة.";
});
$("protection-payment").addEventListener("change", event => {
 const m = protectionCatalog.payment_methods.find(x => x.id === event.target.value);
 $("payment-instructions").textContent = m ? ((m.account_number ? "رقم الحساب: " + m.account_number + "\n" : "") + (m.instructions || "لا توجد تعليمات إضافية.")) : "تعليمات الدفع المعتمدة ستظهر بعد اختيار الوسيلة.";
 const ref = $("payment-reference"); ref.required = Boolean(m ? m.reference_required !== false : true);
 ref.placeholder = ref.required ? "أدخل مرجع عملية الدفع" : "مرجع الدفع غير مطلوب لهذه الوسيلة.";
});
$("protection-form").addEventListener("submit", event => {
 event.preventDefault();
 const msg = $("protection-message");
 const p = protectionCatalog.packages.find(x => x.id === $("protection-package").value);
 const m = protectionCatalog.payment_methods.find(x => x.id === $("protection-payment").value);
 const ref = $("payment-reference").value.trim();
 if (!p || !m) { setMessage(msg, "اختر الباقة ووسيلة الدفع."); return; }
 if (m.reference_required !== false && !ref) { setMessage(msg, "أدخل مرجع الدفع لهذه الوسيلة."); return; }
 if (ref && m.reference_pattern) { try { if (!new RegExp(m.reference_pattern).test(ref)) { setMessage(msg, "صيغة مرجع الدفع غير مطابقة."); return; } } catch { setMessage(msg, "تعذر التحقق من صيغة مرجع الدفع؛ راجع إعدادات وسيلة الدفع."); return; } }
 protectionContext = { ...protectionContext, package: p, paymentMethod: m, paymentReference: ref };
 const rows = [["الرقم", protectionContext.phone], ["الشركة", protectionContext.company], ["نوع العملية", operationLabels[protectionContext.type]], ["الباقة", p.name], ["المدة", p.duration_days + " يوم"], ["السعر", Number(p.price_yer).toLocaleString("ar") + " ر.ي"], ["وسيلة الدفع", m.name]];
 if (ref) rows.push(["مرجع الدفع", ref]);
 const host = $("review-details"); host.replaceChildren();
 rows.forEach(([a, b]) => { const r = el("div", "review-row"); r.append(el("span", "", a), el("strong", "", b)); host.append(r); });
 $("review-message").textContent = "";
 navigate("review");
});
$("confirm-protection").addEventListener("click", async () => {
 if (protectionSubmitting || !protectionContext || !protectionContext.package) return;
 const button = $("confirm-protection"), c = protectionContext;
 protectionSubmitting = true; button.disabled = true; button.textContent = "جارٍ الإرسال…";
 const result = await svc().submitProtectionRequest({ phone: c.phone, company_id: c.company_id, operation_type: c.type, package_id: c.package.id, payment_method_id: c.paymentMethod.id, payment_reference: c.paymentReference });
 protectionSubmitting = false; button.disabled = false; button.textContent = "تأكيد وإرسال الطلب";
 if (!session) return;
 const confirmed = result.success === true && Boolean(result.request_id);
 const content = $("result-content"); content.replaceChildren();
 $("result-title").textContent = confirmed ? "تم إرسال الطلب" : "تعذر تأكيد إرسال الطلب";
 $("result-description").textContent = confirmed ? "استلمت أمان طلبك وهو قيد المراجعة. لا تبدأ الحماية إلا بعد اعتماد الإدارة." : "لم يتم تأكيد إنشاء الطلب. يمكنك مراجعة بياناتك وإعادة المحاولة بعد التحقق من قائمة العمليات.";
 if (confirmed) {
  const box = el("div", "result-success"); box.append(el("strong", "", "طلبك قيد المراجعة"), el("div", "detail-label", "رقم الطلب"));
  const num = el("div", "detail-value", result.request_number || result.request_id); num.dir = "ltr"; box.append(num); content.append(box);
  refreshOperations();
 } else content.append(el("div", "alert-note", serviceProblem(result)));
 $("result-retry").hidden = confirmed;
 navigate("result");
});
$("protection-back").addEventListener("click", returnToNumber);
$("review-back").addEventListener("click", () => navigate("protection"));
$("result-to-operations").addEventListener("click", () => navigate("operations"));
$("result-to-number").addEventListener("click", returnToNumber);
$("result-retry").addEventListener("click", () => navigate("review"));

/* ---------- تنبيهات الرقم (C-11): قراءة التنبيهات المرتبطة بهذا الرقم فقط ---------- */
async function openNumberAlerts(number) {
 if (!number || !number.phone) return false;
 const token = ++alertsToken, msg = $("number-alerts-message"), host = $("number-alerts-list");
 $("alerts-phone").textContent = number.phone; $("alerts-company").textContent = number.company || "";
 $("alerts-status").textContent = numberStatusLabels[number.status] || "";
 host.replaceChildren(); setMessage(msg, "جارٍ تحميل التنبيهات…", "info");
 navigate("number-alerts");
 const result = await svc().listNumberAlerts({ phone: number.phone });
 if (token !== alertsToken || !session) return true;
 if (result.success !== true) { setMessage(msg, serviceProblem(result)); const retry = el("button", "btn btn-outline", "إعادة المحاولة"); retry.type = "button"; retry.addEventListener("click", () => openNumberAlerts(number)); host.append(retry); return true; }
 msg.textContent = ""; msg.className = "";
 const items = result.items || [];
 if (!items.length) { host.append(emptyBox("bell", "لا توجد تنبيهات لهذا الرقم")); return true; }
 items.forEach(a => { const card = el("article", "surface notification-card"), head = el("div", "notification-head"); head.append(el("strong", "", a.title), el("span", "state " + (a.read_at ? "state-off" : "state-wait"), a.read_at ? "مقروء" : "جديد")); card.append(head, el("p", "", a.body), el("small", "", fmt(a.created_at))); host.append(card); });
 return true;
}

/* ---------- تقديم بلاغ (C-12): من «محمي لدى عميل آخر» فقط ---------- */
function openReport(number) {
 if (!number || number.status !== "other_protected") return false;
 reportNumber = number;
 $("report-phone-display").textContent = number.phone; $("report-company-display").textContent = number.company || "";
 $("report-form").reset(); $("report-text-wrap").hidden = true; setMessage($("report-message"), "", "info");
 navigate("report");
 return true;
}
document.querySelectorAll('input[name="reason_code"]').forEach(r => r.addEventListener("change", () => { $("report-text-wrap").hidden = $("report-form").elements.reason_code.value !== "other"; }));
$("report-form").addEventListener("submit", async event => {
 event.preventDefault();
 if (reportSubmitting || !reportNumber) return;
 const msg = $("report-message"), button = $("report-submit");
 const reason = $("report-form").elements.reason_code.value, text = $("report-description").value.trim();
 if (!reason) { setMessage(msg, "اختر سبب البلاغ."); return; }
 if (reason === "other" && !text) { setMessage(msg, "أدخل توضيح البلاغ لسبب «سبب آخر»."); return; }
 reportSubmitting = true; button.disabled = true; button.textContent = "جارٍ الإرسال…";
 const result = await svc().submitReport({ phone: reportNumber.phone, reason_code: reason, reason_text: reason === "other" ? text : "" });
 reportSubmitting = false; button.disabled = false; button.textContent = "إرسال البلاغ";
 if (!session) return;
 if (result.success === true && result.report_id) { setMessage(msg, "تم استلام البلاغ. رقم البلاغ: " + result.report_id, "success"); $("report-form").reset(); $("report-text-wrap").hidden = true; }
 else setMessage(msg, "لم يتم تأكيد استلام البلاغ. " + serviceProblem(result));
});

/* ---------- المصادقة (D3): شاشتا تسجيل الدخول وإنشاء الحساب ---------- */
$("login-to-signup").addEventListener("click", () => { setMessage($("signup-message"), "", "info"); navigate("signup"); });
$("signup-to-login").addEventListener("click", () => { setMessage($("login-message"), "", "info"); navigate("login"); });
/* بعد نجاح الدخول أو الإنشاء: نؤكد الجلسة من الخدمة ثم نفتح الرئيسية؛ إن لم تتأكد نبقى على الشاشة الحالية برسالة. */
async function afterAuth(messageNode) {
 ["login-password", "signup-password", "signup-confirm"].forEach(id => { $(id).value = ""; });
 await loadSession();
 if (!session) { setMessage(messageNode, "تعذر تأكيد الجلسة بعد الدخول. حاول مرة أخرى."); return; }
 messageNode.textContent = "";
 navigate("home");
}
$("login-form").addEventListener("submit", async event => {
 event.preventDefault();
 const msg = $("login-message"), button = $("login-submit");
 const email = $("login-email").value.trim(), password = $("login-password").value;
 button.disabled = true; setMessage(msg, "جارٍ التحقق…", "info");
 const result = await svc().signIn({ email, password });
 button.disabled = false;
 if (result.success !== true) { setMessage(msg, serviceProblem(result)); return; }
 await afterAuth(msg);
});
$("signup-form").addEventListener("submit", async event => {
 event.preventDefault();
 const msg = $("signup-message"), button = $("signup-submit");
 const email = $("signup-email").value.trim(), password = $("signup-password").value, confirm = $("signup-confirm").value;
 if (password !== confirm) { setMessage(msg, "كلمتا المرور غير متطابقتين."); return; }
 button.disabled = true; setMessage(msg, "جارٍ إنشاء الحساب…", "info");
 const result = await svc().signUp({ email, password });
 button.disabled = false;
 if (result.success !== true) { setMessage(msg, serviceProblem(result)); return; }
 await afterAuth(msg);
});

/* ---------- الحساب (C-09) ---------- */
function renderAccount() {
 $("account-signed-in").hidden = !session;
 if (!session) return;
 $("account-email").textContent = session.email || "";
 $("account-type").textContent = accountTypeLabels[session.account_type] || "مستخدم";
 if (document.activeElement !== $("profile-name")) $("profile-name").value = session.full_name || "";
}
$("profile-form").addEventListener("submit", async event => {
 event.preventDefault();
 const msg = $("profile-message"), result = await svc().updateProfile({ full_name: $("profile-name").value.trim() });
 if (!session) return;
 if (result.success === true) { setMessage(msg, "تم تحديث البيانات.", "success"); await loadSession(); } else setMessage(msg, serviceProblem(result));
});
$("password-form").addEventListener("submit", async event => {
 event.preventDefault();
 const msg = $("password-message"), form = event.currentTarget;
 const current_password = $("current-password").value, new_password = $("new-password").value;
 if (new_password.length < 4) { setMessage(msg, "كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف."); return; }
 const result = await svc().changePassword({ current_password, new_password });
 if (!session) return;
 if (result.success === true) { form.reset(); setMessage(msg, "تم تحديث كلمة المرور.", "success"); } else setMessage(msg, serviceProblem(result));
});
$("account-signout").addEventListener("click", () => { $("signout-confirm").hidden = false; $("account-signout").hidden = true; });
$("signout-confirm-no").addEventListener("click", () => { $("signout-confirm").hidden = true; $("account-signout").hidden = false; });
$("signout-confirm-yes").addEventListener("click", async () => {
 const msg = $("signout-message"), result = await svc().signOut();
 $("signout-confirm").hidden = true; $("account-signout").hidden = false;
 if (result.success === true || result.code === "auth_required") { msg.textContent = ""; await loadSession(); showLogin("تم تسجيل الخروج.", "success"); }
 else setMessage(msg, serviceProblem(result));
});

/* ---------- الإشعارات (C-10) ---------- */
function renderNotifications() {
 const host = $("notifications-list"), filter = $("notification-filter").value;
 host.replaceChildren();
 const box = listStateBox("notifications", () => refreshNotifications(), "لا توجد إشعارات", "ستظهر هنا إشعارات حسابك عند وصولها.");
 $("notifications-dot").hidden = !lists.notifications.items.some(n => !n.read_at);
 if (box) { host.append(box); return; }
 const items = lists.notifications.items.filter(n => filter === "all" || (filter === "unread" && !n.read_at) || (filter === "read" && n.read_at));
 if (!items.length) { host.append(emptyBox("bell", "لا توجد إشعارات في هذا التصنيف")); return; }
 items.forEach(item => {
  const card = el("article", "surface notification-card"), head = el("div", "notification-head");
  head.append(el("strong", "", item.title || "إشعار من أمان"), el("span", "state " + (item.read_at ? "state-off" : "state-wait"), item.read_at ? "مقروء" : "جديد"));
  card.append(head, el("p", "", item.body || ""), el("small", "", fmt(item.created_at)));
  if (!item.read_at) { const b = el("button", "quiet-link", "تحديد كمقروء"); b.type = "button"; b.addEventListener("click", () => markRead(item.id)); card.append(b); }
  host.append(card);
 });
}
async function markRead(id) {
 const result = await svc().markNotificationRead({ notification_id: id });
 if (!session) return;
 if (result.success === true) await refreshNotifications(true); else setMessage($("notifications-message"), serviceProblem(result));
}
$("notification-filter").addEventListener("change", renderNotifications);
$("notifications-refresh").addEventListener("click", () => refreshNotifications());

function renderAll() { renderHomeNumbers(); renderNumbers(); renderOperations(); renderNotifications(); }

/* ---------- الإقلاع: لا شاشة داخلية قبل تأكيد الجلسة ---------- */
renderAll();
navigate("boot", { scroll: false, remember: false });
(async () => {
 const result = await loadSession();
 if (session) { navigate("home", { scroll: false, remember: false }); return; }
 /* بلا جلسة: تسجيل الدخول. فشل غير «الخدمة غير مهيأة» (مثل تعذر الاتصال) يُعرض برسالته. */
 const problem = result.success !== true && result.code !== "service_not_configured" ? serviceProblem(result) : "";
 clearPrivateState();
 setMessage($("login-message"), problem, "error");
 navigate("login", { scroll: false, remember: false });
})();
})();
