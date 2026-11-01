(() => {
"use strict";
const screenIds=["home","numbers","operations","account","notifications","auth"];
const screens=Object.fromEntries(screenIds.map(id=>[id,document.getElementById(id+"-screen")]));
const tabs=[...document.querySelectorAll("[data-tab]")];
const sheet=document.getElementById("number-sheet");
let currentScreen="home";
const tabForScreen={home:"home",numbers:"numbers",operations:"operations"};
function navigate(name,{scroll=true}={}){
 if(!screens[name]) return false;
 currentScreen=name;
 Object.entries(screens).forEach(([key,node])=>{if(node)node.hidden=key!==name;});
 tabs.forEach(node=>node.classList.toggle("active",node.dataset.tab===tabForScreen[name]));
 if(sheet) sheet.hidden=true;
 if(scroll) window.scrollTo({top:0,behavior:"smooth"});
 document.dispatchEvent(new CustomEvent("aman:screenchange",{detail:{screen:name}}));
 return true;
}
window.AMANClientNavigation=Object.freeze({navigate,get current(){return currentScreen;}});
tabs.forEach(node=>node.addEventListener("click",()=>navigate(node.dataset.tab)));
document.querySelectorAll("[data-navigate]").forEach(node=>node.addEventListener("click",()=>navigate(node.dataset.navigate)));
document.getElementById("show-all-numbers").addEventListener("click",()=>navigate("numbers"));
document.getElementById("account-button").addEventListener("click",()=>navigate("account"));
document.getElementById("notifications-button").addEventListener("click",()=>navigate("notifications"));
document.getElementById("open-login").addEventListener("click",()=>navigate("auth"));
document.querySelector(".brand").addEventListener("click",event=>{event.preventDefault();navigate("home");});
function closeSheet(){if(sheet)sheet.hidden=true;}
document.getElementById("close-sheet").addEventListener("click",closeSheet);
document.getElementById("sheet-done").addEventListener("click",closeSheet);
sheet.addEventListener("click",event=>{if(event.target===sheet)closeSheet();});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeSheet();});
const normalize=value=>String(value||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[^0-9]/g,"");
document.getElementById("search-form").addEventListener("submit",event=>{
 event.preventDefault();
 const input=document.getElementById("phone-search"),message=document.getElementById("search-message"),phone=normalize(input.value);
 if(phone.length<9||phone.length>15){message.textContent="يرجى إدخال رقم هاتف صحيح.";return;}
 message.textContent="البحث المباشر غير متاح بعد؛ لم يتم الاتصال بقاعدة بيانات أو بشركات الاتصالات.";
});
document.getElementById("auth-switch").addEventListener("click",()=>{
 const title=document.getElementById("auth-title"),description=document.getElementById("auth-description"),button=document.getElementById("auth-submit"),switcher=document.getElementById("auth-switch");
 const signup=title.textContent==="تسجيل الدخول";
 title.textContent=signup?"إنشاء حساب جديد":"تسجيل الدخول";
 description.textContent=signup?"أدخل بريدك الإلكتروني وكلمة المرور لإنشاء حساب.":"أدخل بريدك الإلكتروني للمتابعة إلى حسابك.";
 button.textContent=signup?"إنشاء الحساب":"دخول";
 switcher.textContent=signup?"لديك حساب بالفعل؟ تسجيل الدخول":"إنشاء حساب جديد";
 document.getElementById("auth-password").autocomplete=signup?"new-password":"current-password";
});
document.getElementById("auth-form").addEventListener("submit",event=>{
 event.preventDefault();
 document.getElementById("auth-message").textContent="لم يتم إرسال بياناتك. يلزم ربط خدمة المصادقة الآمنة قبل تفعيل الدخول وإنشاء الحساب.";
});
navigate("home",{scroll:false});
})();