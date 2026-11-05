/* AMAN.D — تقارير الإيرادات والعمليات المعتمدة. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const services = () => window.AMANAdminServices || {};
const state = { range: "30" };
const el = (tag, cls="", value) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value !== undefined) node.textContent = String(value ?? "—");
  return node;
};
const money = value => Number(value || 0).toLocaleString("ar") + " ر.ي";
const dateLabel = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) :
    date.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Aden" });
};
const panel = (title, rows) => {
  const box = el("section", "surface admin-detail-panel");
  box.append(el("h2", "surface-title", title));
  rows.forEach(([label, value]) => {
    const row = el("div", "admin-detail-row");
    row.append(el("span", "", label), el("strong", "", value ?? "—"));
    box.append(row);
  });
  return box;
};
const note = (host, text, error=false) => host.append(el("p", error ? "notice-error" : "notice-info", text));
function renderReports(host) {
  host.replaceChildren();
  const controls = el("section", "surface");
  const label = el("label", "field-label", "النطاق الزمني");
  const range = el("select", "field");
  [["7","آخر 7 أيام"],["30","آخر 30 يومًا"],["90","آخر 90 يومًا"],["365","آخر سنة"],["all","كل الفترات"]]
    .forEach(([value,title]) => range.add(new Option(title,value)));
  range.value = state.range;
  label.htmlFor = "aman-report-range";
  range.id = "aman-report-range";
  controls.append(label, range);
  const summary = el("div");
  const list = el("div");
  summary.id = "aman-report-summary";
  list.id = "aman-report-operations";
  host.append(controls, summary, list);
  range.addEventListener("change", () => { state.range=range.value; loadRevenue(); });
}
async function loadRevenue() {
  const summary=$("aman-report-summary"), list=$("aman-report-operations");
  if (!summary || !list) return false;
  summary.setAttribute("aria-busy","true");
  try {
    const result=await services().getRevenueReport({days:state.range});
    if (result?.success!==true || !Array.isArray(result.operations)) throw new Error("report unavailable");
    summary.replaceChildren(panel("ملخص الإيرادات المعتمدة",[
      ["عدد العمليات",String(result.count ?? result.operations.length)],
      ["إجمالي الإيرادات",money(result.total_yer)],
      ["الفترة",result.period_label || "—"]
    ]));
    [
      ["حسب نوع العملية",result.by_operation],
      ["حسب الشركة",result.by_company],
      ["حسب الباقة",result.by_package],
      ["حسب وسيلة الدفع",result.by_payment]
    ].forEach(([title,items]) => {
      if (Array.isArray(items) && items.length)
        summary.append(panel(title,items.map(item=>[item.name,(item.count ?? 0)+" عملية • "+money(item.total_yer)])));
    });
    list.replaceChildren();
    if (!result.operations.length) note(list,"لا توجد عمليات معتمدة في هذه الفترة.");
    else list.append(panel("العمليات المعتمدة",result.operations.map(item=>[
      item.request_number || item.id,
      [item.operation_type_label || item.operation_type,item.company_name,item.package_name,
       item.payment_method_name,dateLabel(item.approved_at)].filter(Boolean).join(" • ")+" — "+money(item.price_yer)
    ])));
    return true;
  } catch {
    summary.replaceChildren();
    list.replaceChildren();
    note(summary,"تعذر تحميل تقرير الإيرادات. أعد المحاولة.",true);
    return false;
  } finally { summary.removeAttribute("aria-busy"); }
}
if (window.AMANPullToRefresh) window.AMANPullToRefresh.register("reports",loadRevenue);
document.addEventListener("aman:admin-screenchange", event => {
  if (event.detail?.screen!=="reports") return;
  const host=$("admin-generic-view");
  if (!host) return;
  renderReports(host);
  loadRevenue();
});
})();