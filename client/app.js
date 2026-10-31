import { addCustomer } from "../shared/storage.js";
const form=document.querySelector("#register-form");
const message=document.querySelector("#message");
form.addEventListener("submit",event=>{
 event.preventDefault();
 const name=form.elements.name.value.trim();
 const phone=form.elements.phone.value.trim();
 if(name.length<2||phone.length<6){message.textContent="يرجى إدخال اسم ورقم تجريبيين صحيحين.";return;}
 try{addCustomer({name,phone});message.textContent="تم تسجيل العميل تجريبيًا. افتح واجهة الإدارة للتحقق من ظهوره.";form.reset();}
 catch(error){message.textContent=error.message||"تعذر حفظ بيانات الاختبار.";}
});