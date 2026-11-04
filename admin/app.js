(() => {
"use strict";
const $=id=>document.getElementById(id);
const dashboard=$("dashboard-screen"),section=$("admin-section"),login=$("admin-login"),nav=$("admin-bottom-nav");
const tabs=[...document.querySelectorAll("[data-admin-tab]")];
const service=()=>window.AMANAdminServices||null;
/* جدول أيقونات SVG ثابتة داخلية (ليست من بيانات المستخدم) */
const svgWrap=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const ICONS={
 list:svgWrap('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
 phone:svgWrap('<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M9 6h6M9 10h2m3 0h1M9 14h2m3 0h1m-5 4h2"/>'),
 users:svgWrap('<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8m2 3a6 6 0 0 1 3 6"/>'),
 user:svgWrap('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
 clock:svgWrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 timer:svgWrap('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
 flag:svgWrap('<path d="M4 22V4M4 4h14l-2 4 2 4H4"/>'),
 doc:svgWrap('<path d="M7 3h10l3 3v15H4V3zM8 10h8M8 14h8M8 18h5"/>'),
 sliders:svgWrap('<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
 bell:svgWrap('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>'),
 box:svgWrap('<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'),
 wallet:svgWrap('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
 dots:svgWrap('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>')
};
const definitions={
 requests:{title:"الطلبات",description:"مراجعة طلبات الخدمة.",icon:"list",emptyTitle:"لا توجد طلبات",emptyDescription:"تظهر الطلبات الواردة هنا."},
 numbers:{title:"الأرقام",description:"متابعة الأرقام وحالات الحماية.",icon:"phone",emptyTitle:"لا توجد أرقام",emptyDescription:"تظهر الأرقام بعد اعتماد الطلبات."},
 customers:{title:"العملاء",description:"حسابات العملاء وحالاتها.",icon:"users",emptyTitle:"لا يوجد عملاء",emptyDescription:"تظهر حسابات العملاء هنا."},
 tasks:{title:"مهام السداد",description:"مواعيد السداد وتنفيذها.",icon:"clock",emptyTitle:"لا توجد مهام سداد",emptyDescription:"تظهر المهام بعد اعتماد الطلبات."},
 complaints:{title:"البلاغات",description:"مراجعة البلاغات ومتابعتها.",icon:"flag",emptyTitle:"لا توجد بلاغات",emptyDescription:"تظهر البلاغات هنا."},
 reports:{title:"تقارير الإيرادات",description:"العمليات والإيرادات المعتمدة.",icon:"doc",emptyTitle:"لا توجد عمليات معتمدة",emptyDescription:"تظهر الإيرادات بعد اعتماد العمليات."},
 settings:{title:"الشركات والإعدادات",description:"بيانات الشركات والبادئات وإعدادات المهام والتنشيط.",icon:"sliders",emptyTitle:"لم تُضَف شركات بعد",emptyDescription:"أضف الشركات واضبط إعداداتها."},
 notifications:{title:"الإشعارات",description:"عرض الإشعارات وإنشاؤها.",icon:"bell",emptyTitle:"لا توجد إشعارات",emptyDescription:"تظهر الإشعارات هنا."},
 alerts:{title:"تنبيهات الأرقام",description:"استعراض التنبيهات وإنشاء تنبيه لرقم مرتبط بعميل.",icon:"flag",emptyTitle:"لا توجد تنبيهات",emptyDescription:"لا توجد تنبيهات أرقام لعرضها."},
 packages:{title:"باقات الحماية",description:"إدارة الباقات بحسب الشركة ونوع العملية والمدة والسعر.",icon:"box",emptyTitle:"لم تُضَف باقات بعد",emptyDescription:"أضف باقات الحماية المعتمدة لكل شركة وعملية."},
 payments:{title:"وسائل الدفع",description:"إدارة وسائل الدفع وتعليماتها واشتراط مرجع الدفع.",icon:"wallet",emptyTitle:"لم تُضَف وسائل دفع بعد",emptyDescription:"أضف وسائل الدفع المعتمدة."},
 content:{title:"المحتوى الثابت",description:"تحرير الشروط والأحكام والخصوصية والتواصل والمساعدة والدعم.",icon:"doc",emptyTitle:"لا يوجد محتوى محفوظ",emptyDescription:"أضف النصوص الثابتة المعتمدة."},
 audit:{title:"سجل التدقيق",description:"مراجعة أحدث إجراءات الإدارة مع مرشحات الإجراء والكيان.",icon:"clock",emptyTitle:"لا توجد سجلات",emptyDescription:"ستظهر الأحداث الإدارية المسجلة هنا."},
 followup:{title:"نافذة الظهور والمتابعة",description:"المتابعة اليومية للمهام المستحقة ضمن نافذة الظهور قبل مواعيدها: تنفيذها أو إعادة جدولتها.",icon:"timer",emptyTitle:"لا توجد مهام ضمن النافذة",emptyDescription:"ستظهر المهام المستحقة هنا ضمن نافذة الظهور."},
 more:{title:"المزيد",description:"باقي أقسام الإدارة.",icon:"dots",emptyTitle:"",emptyDescription:""},
 account:{title:"الحساب الإداري",description:"عرض بيانات المدير وإدارة جلسة الإدارة.",icon:"user",emptyTitle:"بيانات الحساب غير متاحة",emptyDescription:"تعذر تحميل بيانات المدير الحالي."}
};
let current="login",historyStack=[],activeRequestId=null,requestRows=[],detailRecord=null,adminSession=null,loading=false;
/* حارس المصادقة في الواجهة: لا يُعرض أي قسم إداري إلا بعد تأكيد الخادم أن الحساب مدير.
   هذا حارس عرض فقط؛ التحقق الفعلي من الصلاحية يتم في قاعدة البيانات (aman.adm()). */
const authed=()=>!!adminSession&&adminSession.is_admin===true;
const accountBtn=$("admin-account");
const showAccountButton=on=>{accountBtn.style.display=on?"":"none";};
const statusLabel={pending:"قيد المراجعة",approved:"معتمد",rejected:"مرفوض"};
const typeLabel={subscription:"اشتراك",extension:"تمديد الاشتراك",reactivation:"تنشيط"};
function message(node,text,kind="info"){node.textContent=text;node.className=kind==="error"?"notice-error":kind==="success"?"notice-success":"notice-info";}
function text(v,fallback="—"){return v===null||v===undefined||v===""?fallback:String(v);}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const primaryTabs=["dashboard","requests","numbers","customers"];
function setActive(name){const tab=!name?"":primaryTabs.includes(name)?name:"more";tabs.forEach(t=>t.classList.toggle("active",t.dataset.adminTab===tab));}
function renderMore(){const h=$("admin-generic-view");h.replaceChildren();const order=["tasks","followup","complaints","reports","notifications","alerts","settings","packages","payments","content","audit","account"];const wrap=document.createElement("div");wrap.className="admin-shortcuts";order.forEach(k=>{const d=definitions[k];if(!d)return;const b=document.createElement("button");b.type="button";b.className="admin-shortcut";b.dataset.moreSection=k;const i=document.createElement("span");i.className="quick-icon";i.innerHTML=ICONS[d.icon]||"";const t=document.createElement("strong");t.textContent=d.title;b.append(i,t);b.addEventListener("click",()=>navigate(k));wrap.append(b);});h.append(wrap);}
/* إظهار/إخفاء كلمة المرور في شاشة الدخول: تعود دائمًا إلى «مخفية» عند فتح الشاشة وبعد الدخول */
function setPasswordVisible(show){const i=$("admin-password"),b=$("admin-password-toggle");i.type=show?"text":"password";b.setAttribute("aria-pressed",show?"true":"false");b.setAttribute("aria-label",show?"إخفاء كلمة المرور":"إظهار كلمة المرور");}
function showLogin(){adminSession=null;current="login";historyStack=[];activeRequestId=null;detailRecord=null;dashboard.hidden=true;section.hidden=true;login.hidden=false;nav.hidden=true;showAccountButton(false);setActive("");setPasswordVisible(false);}
function showDashboard(){current="dashboard";login.hidden=true;section.hidden=true;dashboard.hidden=false;nav.hidden=false;showAccountButton(true);setActive("dashboard");loadDashboard();}
function navigate(name,{remember=true}={}) {
 if(name==="login"){showLogin();return true;}
 /* لا تنقل إلى أي شاشة إدارية دون جلسة مدير مؤكدة (يشمل أيقونة الحساب وروابط الأقسام) */
 if(!authed()){showLogin();return false;}
 if(name==="dashboard"){if(remember&&current!=="dashboard")historyStack.push(current);showDashboard();return true;}
 const item=definitions[name];if(!item)return false;
 if(remember&&current!==name)historyStack.push(current);
 current=name;login.hidden=true;dashboard.hidden=true;section.hidden=false;nav.hidden=false;showAccountButton(true);
 $("section-title").textContent=item.title;$("section-description").textContent=item.description;
 $("admin-generic-view").hidden=name==="requests";$("requests-list-view").hidden=name!=="requests";$("request-detail-view").hidden=true;
 setActive(name);window.scrollTo({top:0,behavior:"smooth"});
 document.dispatchEvent(new CustomEvent("aman:admin-screenchange",{detail:{screen:name}}));
 if(name==="requests")loadRequests();
 if(name==="more")renderMore();
 return true;
}
function back(){if(!authed()){showLogin();return;}if(activeRequestId){activeRequestId=null;detailRecord=null;$("requests-list-view").hidden=false;$("request-detail-view").hidden=true;current="requests";loadRequests();return;}const p=historyStack.pop();if(p==="requests"||p==="more"){navigate(p,{remember:false});return;}showDashboard();}
window.AMANAdminNavigation=Object.freeze({navigate,back,get current(){return current;}});
function stat(id,value){$(id).textContent=text(value,"—");}
async function loadDashboard(){
 const s=service();if(!s||typeof s.getDashboardSummary!=="function"){["stat-pending-requests","stat-protected-numbers","stat-open-reports","stat-due-tasks","stat-customers","stat-revenue"].forEach(id=>stat(id,"—"));return;}
 try{const r=await s.getDashboardSummary();if(!r||r.success!==true||!r.summary)return;const x=r.summary;stat("stat-pending-requests",x.pending_requests);stat("stat-protected-numbers",x.protected_numbers);stat("stat-open-reports",x.open_reports);stat("stat-due-tasks",x.due_tasks);stat("stat-customers",x.customers);stat("stat-revenue",x.approved_revenue_yer===undefined?"—":Number(x.approved_revenue_yer).toLocaleString("ar")+" ر.ي");}
 catch{/* keep unavailable values; never fabricate */}}
function normalizeList(r){if(Array.isArray(r))return r;if(Array.isArray(r?.items))return r.items;if(Array.isArray(r?.requests))return r.requests;return [];}
function requestCard(r){
 const card=document.createElement("button");card.type="button";card.className="admin-request-card";
 const main=document.createElement("span");main.className="request-card-main";
 const title=document.createElement("strong");title.textContent=text(r.request_number||r.id,"طلب بدون رقم");
 const phone=document.createElement("span");phone.className="request-phone";phone.dir="ltr";phone.textContent=text(r.phone);
 const meta=document.createElement("small");meta.textContent=[typeLabel[r.operation_type]||r.operation_type||"نوع غير محدد",r.company_name||"الشركة غير محددة",r.customer_name||"العميل"].filter(Boolean).join(" • ");
 main.append(title,phone,meta);
 const side=document.createElement("span");side.className="request-card-side";
 const badge=document.createElement("span");badge.className="state "+(r.status==="approved"?"state-active":r.status==="rejected"?"state-expired":"state-wait");badge.textContent=statusLabel[r.status]||"حالة غير معروفة";
 const date=document.createElement("small");date.textContent=text(r.created_at);
 side.append(badge,date);card.append(main,side);card.addEventListener("click",()=>openRequest(r.id));return card;
}
function renderRequests(){
 const host=$("requests-list");host.replaceChildren();
 if(!requestRows.length){const empty=document.createElement("div");empty.className="surface empty-state";const strong=document.createElement("strong");strong.textContent="لا توجد طلبات مطابقة";const p=document.createElement("p");p.textContent="عدّل التصفية أو حدّث القائمة.";empty.append(strong,p);host.append(empty);return;}
 requestRows.forEach(r=>host.append(requestCard(r)));
}
async function loadRequests(){
 const s=service(),msg=$("requests-message");if(!s||typeof s.listRequests!=="function"){requestRows=[];renderRequests();message(msg,"تعذر الوصول إلى الطلبات حاليًا.","error");return;}
 if(loading)return;loading=true;message(msg,"جارٍ تحميل الطلبات…");
 const filters={search:$("request-search").value.trim(),status:$("request-status").value,operation_type:$("request-type").value,company_id:$("request-company").value};
 try{const result=await s.listRequests(filters);if(result?.success!==true)throw Error("not-confirmed");requestRows=normalizeList(result);const companies=Array.isArray(result.companies)?result.companies:[];const select=$("request-company"),selected=select.value;select.replaceChildren(new Option("كل الشركات","all"));companies.forEach(c=>select.add(new Option(c.name,c.id)));if([...select.options].some(o=>o.value===selected))select.value=selected;renderRequests();message(msg,"تم تحديث قائمة الطلبات.","success");}
 catch{message(msg,"تعذر تحميل الطلبات. حاول التحديث لاحقًا.","error");}
 finally{loading=false;}
}
function detailRow(label,value,dir){const row=document.createElement("div");row.className="admin-detail-row";const l=document.createElement("span");l.textContent=label;const v=document.createElement("strong");v.textContent=text(value);if(dir)v.dir=dir;row.append(l,v);return row;}
function panel(title,rows){const box=document.createElement("section");box.className="surface admin-detail-panel";const h=document.createElement("h2");h.className="surface-title";h.textContent=title;box.append(h);rows.forEach(x=>box.append(detailRow(x[0],x[1],x[2])));return box;}
function openInlineActions(record,host){
 if(record.status!=="pending")return;
 const actions=document.createElement("section");actions.className="surface";
 const h=document.createElement("h2");h.className="surface-title";h.textContent="إجراءات الطلب";actions.append(h);
 const note=document.createElement("p");note.className="surface-desc";note.textContent="يتحقق أمان من الصلاحية والبيانات ومرجع الدفع قبل اعتماد الطلب أو رفضه.";actions.append(note);
 const approve=document.createElement("button");approve.className="btn btn-block";approve.type="button";approve.textContent="مراجعة أثر الاعتماد";approve.addEventListener("click",()=>showApprovePreview(record,actions));actions.append(approve);
 const reject=document.createElement("button");reject.className="btn btn-outline btn-block";reject.type="button";reject.style.marginTop="9px";reject.textContent="رفض الطلب";reject.addEventListener("click",()=>showRejectForm(record,actions));actions.append(reject);host.append(actions);
}
async function showApprovePreview(record,host){
 const s=service(),box=document.createElement("div");box.className="soft-surface";const h=document.createElement("h3");h.textContent="تأكيد أثر الاعتماد";box.append(h);
 if(!s||typeof s.getApprovalPreview!=="function"){const p=document.createElement("p");p.textContent="معاينة أثر الاعتماد غير متاحة حاليًا.";box.append(p);host.append(box);return;}
 const p=document.createElement("p");p.textContent="جارٍ تحميل الفترة والأثر…";box.append(p);host.append(box);
 try{const r=await s.getApprovalPreview({request_id:record.id});if(r?.success!==true||!r.preview)throw Error();p.textContent="الفترة التي ستنشأ عند التأكيد:";box.append(detailRow("بداية الحماية",r.preview.starts_at),detailRow("نهاية الحماية",r.preview.ends_at),detailRow("أثر الاعتماد",r.preview.effect_description));const confirm=document.createElement("button");confirm.className="btn btn-block";confirm.textContent="تأكيد الاعتماد";confirm.addEventListener("click",()=>performDecision("approve",record.id,{},confirm));box.append(confirm);}
 catch{p.textContent="تعذر جلب معاينة موثوقة. لم يُعتمد الطلب.";}
}
async function showRejectForm(record,host){
 const s=service(),form=document.createElement("form");form.className="soft-surface";const h=document.createElement("h3");h.textContent="تسجيل رفض الطلب";form.append(h);
 const label=document.createElement("label");label.className="field-label";label.textContent="سبب الرفض";const select=document.createElement("select");select.className="field";select.required=true;select.add(new Option("اختر سبب الرفض",""));form.append(label,select);
 const explain=document.createElement("label");explain.className="field-label";explain.style.marginTop="12px";explain.textContent="توضيح إضافي (إن لزم)";const textarea=document.createElement("textarea");textarea.className="field";textarea.rows=3;textarea.maxLength=1000;form.append(explain,textarea);
 const feedback=document.createElement("p");feedback.setAttribute("aria-live","polite");const submit=document.createElement("button");submit.className="btn btn-block";submit.textContent="تأكيد الرفض";form.append(feedback,submit);host.append(form);
 if(!s||typeof s.getRejectReasons!=="function"){message(feedback,"قائمة أسباب الرفض غير متاحة حاليًا.","error");submit.disabled=true;return;}
 try{const r=await s.getRejectReasons();const items=Array.isArray(r?.items)?r.items:[];items.forEach(x=>select.add(new Option(x.label,x.code)));if(r?.success!==true||!items.length)throw Error();}catch{message(feedback,"تعذر تحميل أسباب الرفض المعتمدة.","error");submit.disabled=true;}
 form.addEventListener("submit",e=>{e.preventDefault();if(!select.value){message(feedback,"اختر سبب الرفض أولًا.","error");return;}performDecision("reject",record.id,{reason_code:select.value,explanation:textarea.value.trim()},submit,feedback);});
}
async function performDecision(action,id,payload,button,feedback){
 const s=service(),method=action==="approve"?"approveRequest":"rejectRequest";if(!s||typeof s[method]!=="function"){if(feedback)message(feedback,"تعذر تنفيذ القرار حاليًا.","error");return;}
 button.disabled=true;button.textContent="جارٍ تنفيذ القرار…";
 try{const r=await s[method]({request_id:id,...payload});if(r?.success!==true)throw Error();if(feedback)message(feedback,action==="approve"?"تم اعتماد الطلب.":"تم رفض الطلب.","success");await openRequest(id);await loadRequests();}
 catch{if(feedback)message(feedback,"لم يصل تأكيد موثوق بالقرار. حدّث حالة الطلب قبل إعادة المحاولة.","error");else window.alert("لم يصل تأكيد موثوق بالقرار. حدّث حالة الطلب قبل إعادة المحاولة.");button.disabled=false;button.textContent=action==="approve"?"تأكيد الاعتماد":"تأكيد الرفض";}
}
async function openRequest(id){
 activeRequestId=id;window.AMANAdminCurrentRequest=null;$("requests-list-view").hidden=true;$("request-detail-view").hidden=false;$("request-detail-content").replaceChildren();current="request-detail";window.scrollTo({top:0,behavior:"smooth"});
 const host=$("request-detail-content"),s=service();const loadingBox=document.createElement("div");loadingBox.className="surface empty-state";loadingBox.textContent="جارٍ تحميل تفاصيل الطلب…";host.append(loadingBox);
 if(!s||typeof s.getRequestDetails!=="function"){loadingBox.textContent="تفاصيل الطلب غير متاحة حاليًا.";return;}
 try{const r=await s.getRequestDetails({request_id:id});if(r?.success!==true||!r.request)throw Error();detailRecord=r.request;window.AMANAdminCurrentRequest=detailRecord;host.replaceChildren();const q=detailRecord;
 const status=statusLabel[q.status]||"حالة غير معروفة";
 host.append(panel("بيانات الطلب",[["رقم الطلب",q.request_number||q.id],["نوع العملية",typeLabel[q.operation_type]||q.operation_type],["الحالة",status],["تاريخ الطلب",q.created_at],["الرقم",q.phone,"ltr"],["الشركة",q.company_name],["الباقة",q.package_name],["المدة",q.duration_days? q.duration_days+" يوم":null],["السعر",q.price_yer===undefined?null:Number(q.price_yer).toLocaleString("ar")+" ر.ي"],["وسيلة الدفع",q.payment_method_name],["مرجع الدفع",q.payment_reference,"ltr"]]));
 host.append(panel("بيانات العميل",[["اسم العميل",q.customer_name],["تصنيف الحساب",q.customer_type],["حالة الحساب",q.customer_status],["معرّف العميل",q.customer_id]]));
 host.append(panel("حالة الرقم والتحقق",[["حالة الرقم الحالية",q.number_status],["بداية الحماية الحالية",q.current_protection_starts_at],["نهاية الحماية الحالية",q.current_protection_ends_at],["آخر يوم للتنشيط",q.reactivation_deadline]]));
 const warnings=Array.isArray(q.warnings)?q.warnings:[];if(warnings.length){const p=document.createElement("section");p.className="surface";const h=document.createElement("h2");h.className="surface-title";h.textContent="تنبيهات المراجعة";p.append(h);warnings.forEach(w=>{const x=document.createElement("p");x.className="notice-error";x.textContent=String(w);p.append(x);});host.append(p);}
 openInlineActions(q,host);
 }catch{host.replaceChildren();const err=document.createElement("div");err.className="surface empty-state";err.textContent="تعذر تحميل تفاصيل الطلب. تحقق من الاتصال والصلاحيات ثم حاول مجددًا.";host.append(err);}
}
async function refreshSession(){
 const s=service();if(!s||typeof s.getCurrentAdmin!=="function"){showLogin();return;}
 try{const r=await s.getCurrentAdmin();if(r?.success===true&&r.admin?.is_admin===true){adminSession=r.admin;showDashboard();}else showLogin();}
 catch{showLogin();}
}
$("admin-login-form").addEventListener("submit",async e=>{
 e.preventDefault();
 /* يجب التقاط النموذج قبل أي await: e.currentTarget تصبح null بعد انتهاء توزيع الحدث،
    وكان استدعاء e.currentTarget.reset() بعد نجاح الدخول يرمي TypeError فتظهر رسالة الفشل رغم نجاح المصادقة. */
 const form=e.currentTarget,s=service(),msg=$("admin-login-message"),button=e.submitter||form.querySelector("button[type=submit]");
 if(!s||typeof s.signInAdmin!=="function"){message(msg,"تسجيل الدخول غير متاح حاليًا. لم تُرسل البيانات.","error");return;}
 button.disabled=true;message(msg,"جارٍ التحقق من بيانات الدخول…");
 let ok=false;
 try{const r=await s.signInAdmin({email:$("admin-username").value.trim(),password:$("admin-password").value,remember:$("admin-remember").checked});if(r?.success!==true||r.admin?.is_admin!==true)throw Error();adminSession=r.admin;ok=true;}
 catch{
  adminSession=null;message(msg,"تعذر تسجيل الدخول أو أن الحساب غير مخوّل للإدارة.","error");
  /* لا تُبقِ جلسة سابقة صالحة بعد محاولة دخول فاشلة */
  try{await s.signOutAdmin();}catch{/* لا جلسة لإنهائها */}
 }
 finally{button.disabled=false;}
 if(ok){form.reset();setPasswordVisible(false);message(msg,"تم التحقق من صلاحية الإدارة.","success");showDashboard();}
});
$("admin-password-toggle").addEventListener("click",()=>setPasswordVisible($("admin-password").type==="password"));
$("dashboard-refresh").addEventListener("click",loadDashboard);
accountBtn.addEventListener("click",()=>{if(!authed()){showLogin();return;}navigate("account");});
tabs.forEach(t=>t.addEventListener("click",()=>navigate(t.dataset.adminTab)));
document.querySelectorAll("[data-section]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.section)));
$("admin-back").addEventListener("click",back);$("request-detail-back").addEventListener("click",back);
$("request-detail-refresh").addEventListener("click",()=>activeRequestId&&openRequest(activeRequestId));
$("requests-refresh").addEventListener("click",loadRequests);
$("requests-reset").addEventListener("click",()=>{$("request-search").value="";$("request-status").value="pending";$("request-type").value="all";$("request-company").value="all";loadRequests();});
["request-status","request-type","request-company"].forEach(id=>$(id).addEventListener("change",loadRequests));
let searchTimer=null;$("request-search").addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadRequests,350);});
$("admin-login").hidden=false;dashboard.hidden=true;section.hidden=true;nav.hidden=true;showAccountButton(false);
refreshSession();
})();
