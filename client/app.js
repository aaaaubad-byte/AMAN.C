(() => {
"use strict";
const home=document.getElementById("home-view"),detail=document.getElementById("detail-view");
const list=document.getElementById("my-numbers"),form=document.getElementById("search-form");
const input=document.getElementById("phone-search"),result=document.getElementById("search-result");
const message=document.getElementById("search-message");
const normalize=value=>String(value||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g,"");
function showDetail(phone){document.getElementById("detail-phone").textContent=phone;home.hidden=true;detail.hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
function showHome(){detail.hidden=true;home.hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
function renderNumbers(){
if(!window.AmanStorage){list.innerHTML='<div class="empty">تعذر تحميل بيانات الأرقام.</div>';return;}
const numbers=window.AmanStorage.getNumbers();
list.replaceChildren();
if(!numbers.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="لا توجد أرقام مرتبطة حتى الآن. ستظهر هنا الأرقام بعد اعتماد طلب الاشتراك.";list.append(empty);return;}
numbers.forEach(item=>{
const row=document.createElement("button");row.type="button";row.className="number-row";row.style.width="100%";row.style.border="0";row.style.textAlign="right";row.style.cursor="pointer";
const ico=document.createElement("span");ico.className="number-icon";ico.textContent="▦";
const main=document.createElement("span");main.className="number-main";
const phone=document.createElement("strong");phone.textContent=item.phone;phone.dir="ltr";phone.style.textAlign="right";
const sub=document.createElement("small");sub.textContent="رقم مسجل في المعاينة";
main.append(phone,sub);const state=document.createElement("span");state.className="status";state.textContent="تجريبي";
row.append(ico,main,state);row.addEventListener("click",()=>showDetail(item.phone));list.append(row);
});
}
form.addEventListener("submit",event=>{
event.preventDefault();const query=normalize(input.value);
result.replaceChildren();message.textContent="";
if(query.length<6){message.textContent="أدخل رقمًا صحيحًا للبحث.";return;}
const numbers=window.AmanStorage?window.AmanStorage.getNumbers():[];
const match=numbers.find(item=>normalize(item.phone)===query);
const box=document.createElement("div");box.className="notice";
if(match){box.textContent="هذا الرقم موجود ضمن سجلات المعاينة على هذا المتصفح.";const open=document.createElement("button");open.type="button";open.className="button full";open.style.marginTop="12px";open.textContent="عرض تفاصيل الرقم";open.addEventListener("click",()=>showDetail(match.phone));box.append(open);}
else{box.textContent="لم نعثر على سجل لهذا الرقم في بيانات المعاينة. نتيجة البحث هنا محلية وليست فحصًا من شركات الاتصالات.";}
result.append(box);
});
document.getElementById("refresh-numbers").addEventListener("click",renderNumbers);
document.getElementById("back-home").addEventListener("click",showHome);
window.addEventListener("aman:numbers-changed",renderNumbers);
window.addEventListener("storage",event=>{if(window.AmanStorage&&event.key===window.AmanStorage.key)renderNumbers();});
renderNumbers();
})();