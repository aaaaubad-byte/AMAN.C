(() => {
"use strict";
const dashboard=document.getElementById("dashboard-screen");
const section=document.getElementById("admin-section");
const login=document.getElementById("admin-login");
const tabs=[...document.querySelectorAll("[data-admin-tab]")];
const definitions={
 requests:{title:"الطلبات",description:"مراجعة طلبات الاشتراك والتمديد والتنشيط واتخاذ القرار بشأنها.",icon:"▤",emptyTitle:"لا توجد طلبات لعرضها",emptyDescription:"ستظهر الطلبات الواردة هنا مع بيانات العميل والرقم والشركة ومرجع الدفع."},
 numbers:{title:"الأرقام",description:"متابعة الأرقام وحالات الحماية وسجل العمليات المرتبطة بها.",icon:"▦",emptyTitle:"لا توجد أرقام مسجلة",emptyDescription:"ستظهر الأرقام بعد اعتماد طلبات الحماية وربطها بحسابات العملاء."},
 customers:{title:"العملاء",description:"إدارة حسابات العملاء وحالات تفعيلها وصلاحياتها.",icon:"♙",emptyTitle:"لا توجد حسابات لعرضها",emptyDescription:"ستظهر حسابات العملاء بعد تفعيل التسجيل والمصادقة."},
 tasks:{title:"مهام السداد",description:"متابعة مواعيد السداد الدورية وتنفيذها وجدولتها.",icon:"◷",emptyTitle:"لا توجد مهام لعرضها",emptyDescription:"ستظهر المهام وفق إعدادات الشركات وخطط الحماية المعتمدة."},
 reports:{title:"التقارير",description:"تقارير العمليات والإيرادات والاشتراكات المعتمدة.",icon:"▥",emptyTitle:"التقارير غير متاحة",emptyDescription:"ستُحتسب التقارير من السجلات الفعلية المعتمدة فقط."},
 settings:{title:"الإعدادات",description:"إدارة الشركات والبادئات والباقات ووسائل الدفع وإعدادات الخدمة.",icon:"⚙",emptyTitle:"الإعدادات غير مربوطة",emptyDescription:"ستُدار الإعدادات من قاعدة البيانات بصلاحيات إدارية."}
};
let current="dashboard";
const historyStack=[];
function setActive(name){tabs.forEach(tab=>tab.classList.toggle("active",tab.dataset.adminTab===name));}
function navigate(name,{remember=true}={}){
 if(name==="login"){
  if(remember&&current!=="login")historyStack.push(current);
  current="login";dashboard.hidden=true;section.hidden=true;login.hidden=false;
  setActive("");window.scrollTo({top:0,behavior:"smooth"});return true;
 }
 if(name==="dashboard"){
  if(remember&&current!=="dashboard")historyStack.push(current);
  current="dashboard";login.hidden=true;section.hidden=true;dashboard.hidden=false;
  setActive("dashboard");window.scrollTo({top:0,behavior:"smooth"});return true;
 }
 const item=definitions[name];if(!item)return false;
 if(remember&&current!==name)historyStack.push(current);
 current=name;login.hidden=true;dashboard.hidden=true;section.hidden=false;
 document.getElementById("section-title").textContent=item.title;
 document.getElementById("section-description").textContent=item.description;
 document.getElementById("section-icon").textContent=item.icon;
 document.getElementById("section-empty-title").textContent=item.emptyTitle;
 document.getElementById("section-empty-description").textContent=item.emptyDescription;
 setActive(name);window.scrollTo({top:0,behavior:"smooth"});
 document.dispatchEvent(new CustomEvent("aman:admin-screenchange",{detail:{screen:name}}));
 return true;
}
function goBack(){
 const previous=historyStack.pop();
 if(previous){navigate(previous,{remember:false});return;}
 navigate("dashboard",{remember:false});
}
window.AMANAdminNavigation=Object.freeze({navigate,back:goBack,get current(){return current;}});
tabs.forEach(tab=>tab.addEventListener("click",()=>navigate(tab.dataset.adminTab)));
document.querySelectorAll("[data-section]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.section)));
document.getElementById("admin-back").addEventListener("click",goBack);
document.getElementById("admin-account").addEventListener("click",()=>navigate("login"));
document.getElementById("admin-login-form").addEventListener("submit",event=>{
 event.preventDefault();
 document.getElementById("admin-login-message").textContent="لم يتم إرسال بيانات الدخول. يلزم إعداد خادم المصادقة والتحقق من صلاحية المدير أولًا.";
});
navigate("dashboard",{remember:false});
})();