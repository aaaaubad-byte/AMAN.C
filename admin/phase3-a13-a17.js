(() => {
"use strict";
const $=id=>document.getElementById(id),svc=()=>window.AMANAdminServices||{};
const state={tasks:[],reports:[],revenue:[],taskFilter:"all",reportFilter:"all",range:"30"};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const fmtDate=v=>{if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("ar",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Aden"});};
const money=v=>Number(v||0).toLocaleString("ar")+" ر.ي";
const panel=(title,rows)=>{const p=el("section","surface admin-detail-panel"),h=el("h2","surface-title",title);p.append(h);rows.forEach(([a,b])=>{const r=el("div","admin-detail-row"),k=el("span","",a),v=el("strong","",b??"—");r.append(k,v);p.append(r);});return p;};
function host(){const h=$("admin-generic-view");h.replaceChildren();return h;}
function msg(h,t,kind="info"){const p=el("p","notice-"+kind,t);h.append(p);}
function button(text,cls,fn){const b=el("button",cls||"btn btn-outline",text);b.type="button";b.addEventListener("click",fn);return b;}
function taskDetail(t){
 const h=host(),back=button("العودة إلى المهام","btn btn-outline",()=>{renderTasks(h);loadTasks();});h.append(back);
 h.append(panel("تفاصيل المهمة",[["رقم الهاتف",t.phone],["الشركة",t.company_name],["تاريخ الاستحقاق",fmtDate(t.due_at)],["الحالة",({planned:"مخططة",due:"مستحقة",executed:"منفذة"})[t.status]||t.status],["تاريخ التنفيذ الفعلي",fmtDate(t.executed_at)],["معرّف الحماية",t.protection_id||"—"],["سياق الحماية",t.protection_context||"—"]]));
 if(t.status!=="executed"){
  const actions=el("section","surface"),title=el("h2","surface-title","الإجراءات المتاحة");actions.append(title);
  if(t.status==="due"||t.status==="planned")actions.append(button("تنفيذ المهمة","btn btn-block",()=>confirmExecution(t)));
  actions.append(button("إعادة جدولة المهمة","btn btn-outline btn-block",()=>reschedule(t)));h.append(actions);
 }
}
function dialog(title,content,buttons){
 const d=document.createElement("dialog");d.className="admin-decision-dialog";const box=el("div","surface"),h=el("h2","surface-title",title),body=el("div","decision-body");box.append(h,body);d.append(box);body.append(content);buttons.forEach(b=>body.append(b));document.body.append(d);d.addEventListener("close",()=>d.remove());d.showModal();return d;
}
function confirmExecution(t){
 const text=el("p","surface-desc","سيُسجّل وقت التنفيذ الفعلي الحالي. لا يمكن تنفيذ المهمة مرة أخرى بعد تأكيدها.");
 const feedback=el("p","");let d;
 const yes=button("تأكيد التنفيذ","btn btn-block",async()=>{yes.disabled=true;try{const r=await svc().executeTask({task_id:t.id});if(r?.success!==true)throw Error();d.close();await loadTasks();msg(host(),"تم تسجيل تنفيذ المهمة.","success");}catch{feedback.textContent="لم يصل تأكيد موثوق. أعد تحميل المهمة للتحقق قبل تكرار الإجراء.";feedback.className="notice-error";yes.disabled=false;}});
 const no=button("إلغاء","btn btn-outline btn-block",()=>d.close());d=dialog("تأكيد تنفيذ المهمة",text,[feedback,yes,no]);
}
function reschedule(t){
 const wrap=el("div",""),label=el("label","field-label","الموعد الجديد"),date=el("input","field");date.type="datetime-local";date.required=true;
 const impact=el("p","notice-info","سيتم عرض المهام المستقبلية غير المنفذة التي سيتغير موعدها قبل الحفظ.");const feedback=el("p","");
 wrap.append(label,date,impact,feedback);let d;
 const preview=button("معاينة أثر الجدولة","btn btn-outline btn-block",async()=>{if(!date.value){feedback.textContent="اختر الموعد الجديد أولًا.";return;}try{const r=await svc().previewTaskReschedule({task_id:t.id,new_due_at:new Date(date.value).toISOString()});if(r?.success!==true)throw Error();impact.textContent="سيتغير موعد "+(r.affected_count||0)+" مهمة غير منفذة، بما فيها المهمة المحددة. لن تتغير المهام المنفذة.";impact.dataset.preview="yes";}catch{impact.textContent="تعذرت معاينة الأثر؛ لم يتم حفظ أي تغيير.";impact.dataset.preview="no";}});
 let save;
 save=button("حفظ الموعد الجديد","btn btn-block",async()=>{if(!date.value){feedback.textContent="اختر الموعد الجديد.";return;}if(impact.dataset.preview!=="yes"){feedback.textContent="اعرض أثر الجدولة قبل الحفظ.";return;}save.disabled=true;try{const r=await svc().rescheduleTask({task_id:t.id,new_due_at:new Date(date.value).toISOString()});if(r?.success!==true)throw Error();d.close();await loadTasks();msg(host(),"تم تحديث مواعيد المهام غير المنفذة.","success");}catch{feedback.textContent="تعذر تأكيد الحفظ. أعد تحميل المهام للتحقق قبل المحاولة مجددًا.";save.disabled=false;}});
 const cancel=button("إلغاء","btn btn-outline btn-block",()=>d.close());d=dialog("إعادة جدولة المهمة",wrap,[preview,save,cancel]);
}
function renderTasks(h){
 h.replaceChildren();const filters=el("section","surface"),select=el("select","field");[["all","كل الحالات"],["planned","مخططة"],["due","مستحقة"],["executed","منفذة"]].forEach(([v,l])=>select.add(new Option(l,v)));select.value=state.taskFilter;
 const refresh=button("تحديث المهام","btn btn-outline",loadTasks);filters.append(el("label","field-label","حالة المهمة"),select,refresh);const list=el("div","");list.id="phase-task-list";h.append(filters,list);
 select.addEventListener("change",()=>{state.taskFilter=select.value;renderTaskRows();});renderTaskRows();
}
function renderTaskRows(){const list=$("phase-task-list");if(!list)return;list.replaceChildren();const rows=state.tasks.filter(t=>state.taskFilter==="all"||t.status===state.taskFilter);if(!rows.length){msg(list,"لا توجد مهام سداد.");return;}
 rows.forEach(t=>{const b=button("", "admin-request-card",()=>taskDetail(t)),main=el("span","request-card-main"),title=el("strong","",t.phone||"رقم غير محدد"),meta=el("small","",[t.company_name||"شركة غير محددة","الاستحقاق: "+fmtDate(t.due_at),({planned:"مخططة",due:"مستحقة",executed:"منفذة"})[t.status]||t.status].join(" • "));main.append(title,meta);b.append(main);list.append(b);});
}
async function loadTasks(){const s=svc();try{const r=await s.listTasks();if(r?.success!==true||!Array.isArray(r.tasks))throw Error();state.tasks=r.tasks;renderTaskRows();}catch{const h=$("phase-task-list");if(h){h.replaceChildren();msg(h,"تعذر تحميل المهام. أعد المحاولة.","error");}}}
function renderReports(h){
 h.replaceChildren();const controls=el("section","surface"),range=el("select","field");[["7","آخر 7 أيام"],["30","آخر 30 يومًا"],["90","آخر 90 يومًا"],["365","آخر سنة"],["all","كل الفترات"]].forEach(([v,l])=>range.add(new Option(l,v)));range.value=state.range;
 const refresh=button("تحديث التقرير","btn btn-outline",loadRevenue);controls.append(el("label","field-label","النطاق الزمني"),range,refresh);const summary=el("div",""),list=el("div","");summary.id="phase-revenue-summary";list.id="phase-revenue-list";h.append(controls,summary,list);range.addEventListener("change",()=>{state.range=range.value;loadRevenue();});
}
async function loadRevenue(){const s=svc(),summary=$("phase-revenue-summary"),list=$("phase-revenue-list");if(!summary||!list)return;summary.replaceChildren();list.replaceChildren();msg(summary,"جارٍ تحميل الإيرادات…");try{const r=await s.getRevenueReport({days:state.range});if(r?.success!==true||!Array.isArray(r.operations))throw Error();summary.replaceChildren();summary.append(panel("ملخص الإيرادات المعتمدة",[["عدد العمليات",String(r.count)],["إجمالي الإيرادات",money(r.total_yer)],["الفترة",r.period_label||"—"]]));const groups=[["حسب نوع العملية",r.by_operation],["حسب الشركة",r.by_company],["حسب الباقة",r.by_package],["حسب وسيلة الدفع",r.by_payment]];groups.forEach(([title,items])=>{if(items?.length)summary.append(panel(title,items.map(x=>[x.name,x.count+" عملية • "+money(x.total_yer)]));});if(!r.operations.length){msg(list,"لا توجد عمليات معتمدة في هذه الفترة.");return;}list.append(panel("العمليات المعتمدة",r.operations.map(x=>[x.request_number||x.id,[x.operation_type_label||x.operation_type,x.company_name,x.package_name,x.payment_method_name,fmtDate(x.approved_at)].filter(Boolean).join(" • ")+" — "+money(x.price_yer)]));}catch{summary.replaceChildren();msg(summary,"تعذر تحميل تقرير الإيرادات. أعد المحاولة.","error");}}
function renderComplaints(h){h.replaceChildren();const filter=el("select","field");[["all","كل البلاغات"],["open","قيد المعالجة"],["resolved","تمت المعالجة"]].forEach(([v,l])=>filter.add(new Option(l,v)));filter.value=state.reportFilter;const refresh=button("تحديث البلاغات","btn btn-outline",loadComplaints),box=el("section","surface"),list=el("div","");list.id="phase-complaints-list";box.append(el("label","field-label","حالة المعالجة"),filter,refresh);h.append(box,list);filter.addEventListener("change",()=>{state.reportFilter=filter.value;renderComplaintRows();});renderComplaintRows();}
function renderComplaintRows(){const list=$("phase-complaints-list");if(!list)return;list.replaceChildren();const rows=state.reports.filter(r=>state.reportFilter==="all"||r.status===state.reportFilter);if(!rows.length){msg(list,"لا توجد بلاغات.");return;}rows.forEach(r=>{const b=button("","admin-request-card",()=>complaintDetail(r)),main=el("span","request-card-main"),title=el("strong","",r.phone||"رقم غير محدد"),meta=el("small","",[r.reason||r.report_type||"بلاغ",r.company_name||"شركة غير محددة",fmtDate(r.created_at),r.customer_name||"مقدم البلاغ"].join(" • "));main.append(title,meta);b.append(main,el("span","state state-wait",r.status==="open"?"قيد المعالجة":"تمت المعالجة"));list.append(b);});}
async function loadComplaints(){try{const r=await svc().listComplaints();if(r?.success!==true||!Array.isArray(r.reports))throw Error();state.reports=r.reports;renderComplaintRows();}catch{const l=$("phase-complaints-list");if(l){l.replaceChildren();msg(l,"تعذر تحميل البلاغات. أعد المحاولة.","error");}}}
function complaintDetail(r){const h=host(),back=button("العودة إلى البلاغات","btn btn-outline",()=>{renderComplaints(h);loadComplaints();});h.append(back,panel("تفاصيل البلاغ",[["مقدم البلاغ",r.customer_name],["الرقم",r.phone],["الشركة",r.company_name],["السبب",r.reason||r.report_type],["التوضيح",r.description||r.details],["تاريخ التقديم",fmtDate(r.created_at)],["حالة المعالجة",r.status==="open"?"قيد المعالجة":"تمت المعالجة"]]));}
document.addEventListener("aman:admin-screenchange",e=>{const screen=e.detail?.screen,h=$("admin-generic-view");if(!h)return;if(screen==="tasks"){renderTasks(h);loadTasks();}if(screen==="reports"){renderReports(h);loadRevenue();}if(screen==="complaints"){renderComplaints(h);loadComplaints();}});
})();