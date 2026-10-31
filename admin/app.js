(() => {
"use strict";
const tabs=[...document.querySelectorAll("[data-tab]")],title=document.getElementById("content-title"),list=document.getElementById("content-list");
function row(label,sub,badge){const item=document.createElement("div");item.className="list-item";const icon=document.createElement("span");icon.className="number-icon";icon.textContent="▦";const body=document.createElement("span");body.className="grow";const strong=document.createElement("strong");strong.textContent=label;const small=document.createElement("small");small.textContent=sub;body.append(strong,small);item.append(icon,body);if(badge){const tag=document.createElement("span");tag.className="tag";tag.textContent=badge;item.append(tag);}return item;}
function show(tab){
tabs.forEach(button=>button.classList.toggle("active",button.dataset.tab===tab));
title.textContent=tab==="requests"?"الطلبات":tab==="numbers"?"الأرقام":"العملاء";list.replaceChildren();
if(tab==="requests"){const empty=document.createElement("div");empty.className="empty";empty.textContent="لا توجد طلبات فعلية بعد. ستظهر طلبات الاشتراك والتمديد والتنشيط بعد ربط قاعدة البيانات.";list.append(empty);return;}
if(tab==="customers"){const empty=document.createElement("div");empty.className="empty";empty.textContent="إدارة حسابات العملاء ستُفعّل ضمن مرحلة ربط الحسابات والصلاحيات.";list.append(empty);return;}
const numbers=window.AmanStorage?window.AmanStorage.getNumbers():[];
if(!numbers.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="لا توجد أرقام في بيانات المعاينة المحلية.";list.append(empty);return;}
numbers.forEach((number,index)=>list.append(row(number.phone,"سجل تجريبي رقم "+(index+1),"محلي")));
}
tabs.forEach(button=>button.addEventListener("click",()=>show(button.dataset.tab)));
window.addEventListener("aman:numbers-changed",()=>{const active=tabs.find(button=>button.classList.contains("active"));if(active&&active.dataset.tab==="numbers")show("numbers");});
window.addEventListener("storage",event=>{if(window.AmanStorage&&event.key===window.AmanStorage.key){const active=tabs.find(button=>button.classList.contains("active"));if(active&&active.dataset.tab==="numbers")show("numbers");}});
show("requests");
})();