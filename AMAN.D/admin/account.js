/* AMAN.D — بيانات الحساب الإداري وإعدادات المظهر والجلسة. */
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
async function account(){const h=host();try{const r=await S().getCurrentAdmin();if(!r?.success)throw Error();const a=r.admin;const appearance=select("سمة العرض",[["system","حسب الجهاز (افتراضي)"],["light","فاتح"],["dark","داكن"]],window.AMANTheme?.getPreference?.()||"system");appearance.input.dataset.themeSetting="";h.append(panel("الحساب الإداري",[el("p","", "الاسم: "+(a.full_name||"—")),el("p","", "البريد: "+(a.email||"—")),el("p","", "الدور: مدير النظام")]));h.append(panel("إعدادات العرض",[el("p","surface-desc","اختر مظهر التطبيق. خيار «حسب الجهاز» يتبع إعداد المظهر في جهازك."),appearance.wrap]));h.append(panel("جلسة الحساب",[button("تسجيل الخروج",async()=>{if(!confirm("هل تريد تسجيل الخروج من حساب الإدارة؟"))return;const q=await S().signOutAdmin();if(!q?.success){msg(h,"تعذر تأكيد تسجيل الخروج.",true);return;}location.reload();},"btn btn-block")]));return true;}catch{msg(h,"تعذر تحميل بيانات الحساب الإداري.",true);return false;}}

if (window.AMANPullToRefresh) window.AMANPullToRefresh.register("account",account);
document.addEventListener("aman:admin-screenchange",event=>{
  if(event.detail?.screen==="account") account();
});
})();