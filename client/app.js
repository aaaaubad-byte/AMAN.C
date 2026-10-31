(() => {
"use strict";
const screens={home:document.getElementById("home-screen"),numbers:document.getElementById("numbers-screen"),operations:document.getElementById("operations-screen"),account:document.getElementById("account-screen"),notifications:document.getElementById("notifications-screen"),auth:document.getElementById("auth-screen")};
const nav=[...document.querySelectorAll("[data-tab]")];
function show(name){Object.entries(screens).forEach(([key,node])=>node.hidden=key!==name);nav.forEach(node=>node.classList.toggle("active",node.dataset.tab===name));document.getElementById("number-sheet").hidden=true;window.scrollTo({top:0,behavior:"smooth"});}
nav.forEach(node=>node.addEventListener("click",()=>show(node.dataset.tab)));
document.querySelectorAll("[data-view]").forEach(node=>node.addEventListener("click",event=>{event.preventDefault();show(node.dataset.view);}));
document.getElementById("show-all-numbers").addEventListener("click",()=>show("numbers"));
document.getElementById("open-login").addEventListener("click",()=>show("auth"));
document.getElementById("menu-button").addEventListener("click",()=>show("account"));
const sheet=document.getElementById("number-sheet");
function closeSheet(){sheet.hidden=true;}
document.getElementById("close-sheet").addEventListener("click",closeSheet);
document.getElementById("sheet-done").addEventListener("click",closeSheet);
sheet.addEventListener("click",event=>{if(event.target===sheet)closeSheet();});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeSheet();});
const normalize=value=>String(value||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[^0-9]/g,"");
document.getElementById("search-form").addEventListener("submit",event=>{
event.preventDefault();const input=document.getElementById("phone-search");const message=document.getElementById("search-message");const phone=normalize(input.value);
if(phone.length<9||phone.length>15){message.textContent="يرجى إدخال رقم هاتف صحيح.";return;}
message.textContent="البحث المباشر غير متاح بعد؛ لم يتم الاتصال بقاعدة بيانات أو بشركات الاتصالات.";
});
document.getElementById("auth-switch").addEventListener("click",()=>{
const title=document.getElementById("auth-title"),description=document.getElementById("auth-description"),button=document.getElementById("auth-submit"),switcher=document.getElementById("auth-switch");
const signup=title.textContent==="تسجيل الدخول";
title.textContent=signup?"إنشاء حساب جديد":"تسجيل الدخول";
description.textContent=signup?"أدخل رقم هاتفك وكلمة المرور لإنشاء حساب.":"أدخل رقم هاتفك للمتابعة إلى حسابك.";
button.textContent=signup?"إنشاء الحساب":"دخول";
switcher.textContent=signup?"لديك حساب بالفعل؟ تسجيل الدخول":"إنشاء حساب جديد";
document.getElementById("auth-password").autocomplete=signup?"new-password":"current-password";
});
document.getElementById("auth-form").addEventListener("submit",event=>{
event.preventDefault();document.getElementById("auth-message").textContent="لم يتم إرسال بياناتك. يلزم ربط خدمة المصادقة الآمنة قبل تفعيل الدخول وإنشاء الحساب.";
});
})();