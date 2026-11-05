/* AMAN.D — مراجعة البلاغات وتسجيل قرارات معالجتها. */
(() => {
"use strict";
const $=id=>document.getElementById(id), svc=()=>window.AMANAdminServices||{};
const state={complaints:[],notifications:[],alerts:[],companies:[],customers:[]};
const el=(tag,cls="",value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const btn=(label,fn,cls="btn btn-outline")=>{const b=el("button",cls,label);b.type="button";b.addEventListener("click",fn);return b;};
let fieldSeq=0;const field=(label,type="text",value="")=>{const w=el("div"),l=el("label","field-label",label),i=el(type==="textarea"?"textarea":"input","field");if(type==="textarea"){i.rows=3;i.maxLength=1000;}else i.type=type;i.value=value;i.id="f"+(++fieldSeq);l.htmlFor=i.id;w.append(l,i);return {wrap:w,input:i};};
const select=(label,options,value)=>{const w=el("div"),l=el("label","field-label",label),s=el("select","field");options.forEach(([v,t])=>s.add(new Option(t,v)));s.value=value??options[0]?.[0];s.id="f"+(++fieldSeq);l.htmlFor=s.id;w.append(l,s);return {wrap:w,input:s};};
const panel=(title,children)=>{const p=el("section","surface"),h=el("h2","surface-title",title);p.append(h,...children);return p;};
const note=(host,t,error=false)=>host.append(el("p",error?"notice-error":"notice-info",t));
const host=()=>{const h=$("admin-generic-view");h.replaceChildren();return h;};
const showList=(title,items,open,meta)=>{const h=host();const list=el("div");if(!items.length)note(list,"لا توجد بيانات لعرضها.");items.forEach(x=>{const b=btn("",()=>open(x),"admin-request-card"),m=el("span","request-card-main"),s=el("strong","",title(x)),d=el("small","",meta(x));m.append(s,d);b.append(m);list.append(b);});h.append(list);};
async function loadComplaints(){const r=await svc().listComplaints();if(r?.success!==true||!Array.isArray(r.reports))throw Error();state.complaints=r.reports;}
async function complaints(){const h=host();h.setAttribute("aria-busy","true");try{await loadComplaints();h.replaceChildren();const f=select("حالة المعالجة",[["all","كل البلاغات"],["open","قيد المعالجة"],["resolved","تمت المعالجة"]],state.complaintFilter||"all");f.input.id="complaints-filter";f.input.addEventListener("change",()=>{state.complaintFilter=f.input.value;complaints();});const rows=state.complaints.filter(r=>(state.complaintFilter||"all")==="all"||r.status===state.complaintFilter);showList(x=>x.phone,rows,complaint,x=>[x.reason||x.report_type,x.customer_name,x.status==="open"?"قيد المعالجة":"تمت المعالجة"].filter(Boolean).join(" • "));$("admin-generic-view").prepend(f.wrap);return true;}catch{h.replaceChildren();note(h,"تعذر تحميل البلاغات. أعد المحاولة.",true);return false;}finally{h.removeAttribute("aria-busy");}}
function complaint(r){const h=host(),back=btn("العودة إلى البلاغات",complaints);h.append(back);const rows=[["مقدم البلاغ",r.customer_name],["الرقم",r.phone],["الشركة",r.company_name],["السبب",r.reason||r.report_type],["التوضيح",r.description||r.details],["تاريخ التقديم",r.created_at],["حالة المعالجة",r.status==="open"?"قيد المعالجة":"تمت المعالجة"],["مالك الحماية الحالي",r.protection_owner||"غير متاح"]];h.append(panel("تفاصيل البلاغ",rows.map(([k,v])=>el("p","admin-detail-row",k+" : "+(v||"—")))));
if(r.status!=="resolved"){const choices=[["no_action","لا إجراء"]];if(r.protection_active===true)choices.push(["terminate_protection","إنهاء الحماية"]);const decision=select("القرار",choices,"no_action"),reason=field("سبب القرار (إلزامي)","textarea"),feedback=el("p");const box=panel("تسجيل القرار",[decision.wrap,reason.wrap,feedback,btn("حفظ القرار",async()=>{if(!reason.input.value.trim()){feedback.textContent="سبب القرار إلزامي.";return;}const b=decision.input.parentElement;try{const out=await svc().decideComplaint({report_id:r.id,decision:decision.input.value,reason:reason.input.value.trim()});if(out?.success!==true)throw Error();feedback.textContent="تم تسجيل القرار.";complaints();}catch{feedback.textContent="تعذر تسجيل القرار. تحقق من الحالة ثم أعد المحاولة.";}},"btn btn-block")]);h.append(box);}}

if (window.AMANPullToRefresh) window.AMANPullToRefresh.register("complaints",complaints);
document.addEventListener("aman:admin-screenchange",event=>{
  if(event.detail?.screen==="complaints") complaints();
});
})();