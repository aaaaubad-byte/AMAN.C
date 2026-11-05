/* AMAN.D — إدارة المحتوى الثابت وسجل التدقيق. */
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
async function content(){const h=host();h.dataset.noPullRefresh="true";try{const r=await S().getAppContent();if(!r?.success)throw Error();const labels={terms:"الشروط والأحكام",privacy:"سياسة الخصوصية",contact:"التواصل",help:"المساعدة والدعم"};Object.entries(labels).forEach(([key,label])=>{const f=area(label,r.items[key]||"");h.append(panel(label,[f.wrap,button("حفظ النص",async()=>{if(!confirm("تأكيد حفظ نص "+label+"؟"))return;try{const q=await S().saveAppContent({key,body:f.input.value});if(!q?.success)throw Error();msg(h,"تم حفظ "+label+".");}catch{msg(h,"تعذر الحفظ؛ احتفظ بالنص وانسخه قبل إعادة المحاولة.",true);}},"btn btn-block") ]));});return true;}catch{msg(h,"تعذر تحميل المحتوى الثابت.",true);return false;}}
async function audit(){
 const h=host();
 try{
  const r=await S().listAuditLog();
  if(!r?.success)throw Error();
  const items=Array.isArray(r.items)?r.items:[];
  const action=select("الإجراء", [["all","كل الإجراءات"],...(r.actions||[]).map(x=>[x,x])]);
  const entity=select("نوع الكيان", [["all","كل الكيانات"],...(r.entities||[]).map(x=>[x,x])]);
  const search=field("بحث في السجلات","search");
  const rows=el("div"),detail=el("div");
  const showDetail=x=>{
   const values=[
    ["الإجراء",x.action],["الملخص",x.summary],["نوع الكيان",x.entity_type],
    ["معرّف الكيان",x.entity_id],["المنفذ",x.actor_name||x.admin_name||"غير مسجل"],
    ["السبب",x.reason],["التاريخ والوقت",x.created_at]
   ];
   detail.replaceChildren(panel("تفاصيل سجل التدقيق",[
    ...values.filter(([,v])=>v!==undefined&&v!==null&&v!=="").map(([k,v])=>el("p","admin-detail-row",k+" : "+String(v))),
    button("إغلاق التفاصيل",()=>detail.replaceChildren())
   ]));
  };
  const render=()=>{
   rows.replaceChildren();
   const q=search.input.value.trim().toLocaleLowerCase();
   const filtered=items.filter(x=>
    (action.input.value==="all"||x.action===action.input.value)&&
    (entity.input.value==="all"||(x.entity_type||"غير محدد")===entity.input.value)&&
    (!q||[x.action,x.summary,x.entity_type,x.entity_id,x.actor_name,x.admin_name,x.reason,x.created_at].some(v=>String(v??"").toLocaleLowerCase().includes(q)))
   );
   if(!filtered.length){msg(rows,"لا توجد سجلات مطابقة.");return;}
   filtered.forEach(x=>rows.append(panel(x.summary||x.action,[
    el("p","",x.action||"إجراء غير محدد"),
    el("small","",[(x.entity_type||"غير محدد"),(x.entity_id||""),(x.created_at||"")].filter(Boolean).join(" • ")),
    button("عرض التفاصيل",()=>showDetail(x))
   ])));
  };
  action.input.addEventListener("change",render);
  entity.input.addEventListener("change",render);
  search.input.addEventListener("input",render);
  const toolbar=el("div","admin-filter-grid");toolbar.append(search.wrap,action.wrap,entity.wrap);
  h.append(panel("بحث ومرشحات سجل التدقيق",[toolbar]),detail,rows);
  render();
  return true;
 }catch{msg(h,"تعذر تحميل سجل التدقيق.",true);return false;}
}

if (window.AMANPullToRefresh) {
  window.AMANPullToRefresh.register("content",content);
  window.AMANPullToRefresh.register("audit",audit);
}
document.addEventListener("aman:admin-screenchange",event=>{
  if(event.detail?.screen==="content") content();
  if(event.detail?.screen==="audit") audit();
});
})();