/* AMAN.D — إدارة باقات الحماية ووسائل الدفع. */
(() => {
"use strict";
const $=id=>document.getElementById(id),S=()=>window.AMANAdminServices||{};
const el=(tag,cls="",value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const button=(label,fn,cls="btn btn-outline")=>{const b=el("button",cls,label);b.type="button";b.addEventListener("click",fn);return b;};
/* أيقونات SVG ثابتة داخلية لاختصارات الأقسام (ليست من بيانات المستخدم) */
const svgIcon=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const SHORTCUT_ICONS={
 packages:svgIcon('<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'),
 payments:svgIcon('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
 content:svgIcon('<path d="M7 3h10l3 3v15H4V3zM8 10h8M8 14h8M8 18h5"/>'),
 audit:svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 account:svgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')
};
let fieldSeq=0;const field=(label,type="text",value="")=>{const w=el("div"),l=el("label","field-label",label),i=el("input","field");i.type=type;i.value=value;i.id="f"+(++fieldSeq);l.htmlFor=i.id;w.append(l,i);return {wrap:w,input:i};};
const area=(label,value="")=>{const w=el("div"),l=el("label","field-label",label),i=el("textarea","field");i.rows=5;i.maxLength=20000;i.value=value;i.id="a"+(++fieldSeq);l.htmlFor=i.id;w.append(l,i);return {wrap:w,input:i};};
const select=(label,opts,value)=>{const w=el("div"),l=el("label","field-label",label),i=el("select","field");opts.forEach(([v,t])=>i.add(new Option(t,v)));i.value=value??opts[0]?.[0];i.id="s"+(++fieldSeq);l.htmlFor=i.id;w.append(l,i);return {wrap:w,input:i};};
const panel=(title,children)=>{const p=el("section","surface"),h=el("h2","surface-title",title);p.append(h,...children);return p;};
const host=()=>{const h=$("admin-generic-view");h.replaceChildren();delete h.dataset.pullScreen;delete h.dataset.noPullRefresh;return h;};
const msg=(h,t,bad=false)=>h.append(el("p",bad?"notice-error":"notice-info",t));
const list=(title,items,open,meta)=>{const h=host();h.append(button("إضافة جديد",()=>open(null)));if(!items.length)msg(h,"لم تُضَف بيانات بعد.");items.forEach(x=>h.append(panel(title(x),[el("p","",meta(x)),button("تعديل",()=>open(x))])));};
async function packages(){const h=host();try{const r=await S().listPackages();if(!r?.success)throw Error();h.append(button("إضافة باقة",()=>editPackage(null)));if(!r.items.length)msg(h,"لم تُضَف باقات بعد.");r.items.forEach(p=>h.append(panel(p.name,[el("p","",p.company_name+" • "+p.operation_label+" • "+p.days+" يوم • "+p.price_yer+" ر.ي • "+(p.active?"فعالة":"معطلة")),button("تعديل الباقة",()=>editPackage(p))])));return true;}catch{msg(h,"تعذر تحميل الباقات.",true);return false;}}
async function editPackage(p){const h=host();h.dataset.noPullRefresh="true";let companies=[];try{companies=(await S().listCompanies()).companies||[];}catch{}const company=select("الشركة",companies.map(c=>[c.id,c.name]),p?.company_id),op=select("نوع العملية",[["activation","اشتراك"],["extension","تمديد الاشتراك"],["reactivation","تنشيط"]],p?.operation_type),name=field("اسم الباقة","text",p?.name||""),days=field("المدة بالأيام","number",String(p?.days??365)),price=field("السعر بالريال اليمني","number",String(p?.price_yer??1000)),active=select("الحالة",[["true","فعالة"],["false","معطلة"]],String(p?.active??true)),feedback=el("p");h.append(panel(p?"تعديل الباقة":"إضافة باقة",[company.wrap,op.wrap,name.wrap,days.wrap,price.wrap,active.wrap,feedback,button("حفظ الباقة",async()=>{const v={id:p?.id,company_id:company.input.value,operation_type:op.input.value,name:name.input.value.trim(),days:Number(days.input.value),price_yer:Number(price.input.value),active:active.input.value==="true"};if(!v.company_id||!v.name||!Number.isInteger(v.days)||v.days<1||!Number.isInteger(v.price_yer)||v.price_yer<1){feedback.textContent="أدخل شركة واسمًا ومدة وسعرًا صحيحًا.";return;}try{const r=await S().savePackage(v);if(!r?.success)throw Error();packages();}catch{feedback.textContent="تعذر حفظ الباقة.";}},"btn btn-block"),button("إلغاء",packages)]));}
async function payments(){const h=host();try{const r=await S().listPaymentMethods();if(!r?.success)throw Error();h.append(button("إضافة وسيلة دفع",()=>editPayment(null)));if(!r.items.length)msg(h,"لم تُضَف وسائل دفع بعد.");r.items.forEach(p=>h.append(panel(p.name,[el("p","",p.summary||""),el("p","",p.account_number?"رقم الحساب: "+p.account_number:"لا يوجد رقم حساب"),el("p","",p.instructions),el("p","",p.reference_required===false?"مرجع الدفع غير مطلوب":"مرجع الدفع مطلوب"),el("p","",p.active?"فعالة":"معطلة"),button("تعديل",()=>editPayment(p))])));return true;}catch{msg(h,"تعذر تحميل وسائل الدفع.",true);return false;}}
async function editPayment(p){const h=host();h.dataset.noPullRefresh="true";const name=field("اسم الوسيلة","text",p?.name||""),summary=field("ملخص الوسيلة","text",p?.summary||""),account=field("رقم الحساب","text",p?.account_number||""),instructions=area("تعليمات الدفع",p?.instructions||""),required=select("اشتراط مرجع الدفع",[["true","مطلوب"],["false","غير مطلوب"]],String(p?.reference_required??true)),pattern=field("صيغة المرجع (إن عُرفت)","text",p?.reference_pattern||""),active=select("الحالة",[["true","فعالة"],["false","معطلة"]],String(p?.active??true)),feedback=el("p");h.append(panel(p?"تعديل وسيلة الدفع":"إضافة وسيلة دفع",[name.wrap,summary.wrap,account.wrap,instructions.wrap,required.wrap,pattern.wrap,active.wrap,el("p","notice-info","لا تُرفع صور أو مرفقات إيصالات."),feedback,button("حفظ وسيلة الدفع",async()=>{const v={id:p?.id,name:name.input.value.trim(),summary:summary.input.value.trim(),account_number:account.input.value.trim(),instructions:instructions.input.value.trim(),reference_required:required.input.value==="true",reference_pattern:pattern.input.value.trim()||null,active:active.input.value==="true"};if(!v.name||!v.instructions){feedback.textContent="الاسم والتعليمات مطلوبان.";return;}try{const r=await S().savePaymentMethod(v);if(!r?.success)throw Error();payments();}catch{feedback.textContent="تعذر الحفظ.";}},"btn btn-block"),button("إلغاء",payments)]));}

if (window.AMANPullToRefresh) {
  window.AMANPullToRefresh.register("packages",packages);
  window.AMANPullToRefresh.register("payments",payments);
}
document.addEventListener("aman:admin-screenchange",event=>{
  if(event.detail?.screen==="packages") packages();
  if(event.detail?.screen==="payments") payments();
});
})();