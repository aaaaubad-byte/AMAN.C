(() => {
"use strict";
const dashboard=document.getElementById("dashboard-screen"),section=document.getElementById("admin-section"),login=document.getElementById("admin-login");
const tabs=[...document.querySelectorAll("[data-admin-tab]")];
const definitions={
requests:["الطلبات","مراجعة طلبات الاشتراك والتمديد والتنشيط واتخاذ القرار بشأنها.","▤","لا توجد طلبات لعرضها","ستظهر الطلبات الواردة هنا مع بيانات العميل والرقم والشركة ومرجع الدفع."],
numbers:["الأرقام","متابعة الأرقام وحالات الحماية وسجل العمليات المرتبطة بها.","▦","لا توجد أرقام مسجلة","ستظهر الأرقام بعد اعتماد طلبات الحماية وربطها بحسابات العملاء."],
customers:["العملاء","إدارة حسابات العملاء وحالات تفعيلها وصلاحياتها.","♙","لا توجد حسابات لعرضها","ستظهر حسابات العملاء بعد تفعيل التسجيل والمصادقة."],
tasks:["مهام السداد","متابعة مواعيد السداد الدورية وتنفيذها وجدولتها.","◷","لا توجد مهام لعرضها","ستظهر المهام وفق إعدادات الشركات وخطط الحماية المعتمدة."],
reports:["التقارير","تقارير العمليات والإيرادات والاشتراكات المعتمدة.","▥","التقارير غير متاحة","ستُحتسب التقارير من السجلات الفعلية المعتمدة فقط."],
settings:["الإعدادات","إدارة الشركات والبادئات والباقات ووسائل الدفع وإعدادات الخدمة.","⚙","الإعدادات غير مربوطة","ستُدار الإعدادات من قاعدة البيانات بصلاحيات إدارية." ]
};
function openSection(name){
if(name==="dashboard"){section.hidden=true;dashboard.hidden=false;tabs.forEach(tab=>tab.classList.toggle("active",tab.dataset.adminTab==="dashboard"));window.scrollTo({top:0,behavior:"smooth"});return;}
const item=definitions[name];if(!item)return;
dashboard.hidden=true;section.hidden=false;login.hidden=true;
document.getElementById("section-title").textContent=item[0];document.getElementById("section-description").textContent=item[1];document.getElementById("section-icon").textContent=item[2];document.getElementById("section-empty-title").textContent=item[3];document.getElementById("section-empty-description").textContent=item[4];
tabs.forEach(tab=>tab.classList.toggle("active",tab.dataset.adminTab===name));window.scrollTo({top:0,behavior:"smooth"});
}
tabs.forEach(tab=>tab.addEventListener("click",()=>openSection(tab.dataset.adminTab)));
document.querySelectorAll("[data-section]").forEach(button=>button.addEventListener("click",()=>openSection(button.dataset.section)));
document.getElementById("admin-back").addEventListener("click",()=>openSection("dashboard"));
document.getElementById("admin-account").addEventListener("click",()=>{dashboard.hidden=true;section.hidden=true;login.hidden=false;window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("admin-login-form").addEventListener("submit",event=>{event.preventDefault();document.getElementById("admin-login-message").textContent="لم يتم إرسال بيانات الدخول. يلزم إعداد خادم المصادقة والتحقق من صلاحية المدير أولًا.";});
})();