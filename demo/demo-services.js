(() => {
"use strict";
const params = new URLSearchParams(location.search);
if (params.get("demo") !== "1") return;
const KEY = "aman_c_demo_v1";
const now = () => new Date().toISOString();
const id = prefix => prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7);
const seed = () => ({
 users:[{id:"demo-customer",full_name:"عميل تجريبي",email:"customer@aman.demo",password:"1234",status:"active",customer_type:"customer"},{id:"demo-admin",full_name:"مدير تجريبي",email:"admin@aman.demo",password:"1234",status:"active",is_admin:true}],
 session:null, requests:[], numbers:[], notifications:[], alerts:[], reports:[], tasks:[],
 companies:[{id:"yemen-mobile",name:"يمن موبايل"},{id:"you",name:"يو"},{id:"sabafon",name:"سبأفون"},{id:"aden-net",name:"عدن نت"}],
 packages:[{id:"annual",name:"حماية سنوية",duration_days:365,price_yer:1000,company_id:"yemen-mobile",operation_types:["subscription","extension","reactivation"]}],
 payments:[{id:"mobile-money",name:"موبايل موني",instructions:"أرسل المبلغ إلى وسيلة الدفع التجريبية ثم أدخل مرجعًا تجريبيًا."}]
});
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.users)&&Array.isArray(x.requests))return x;}catch{}return seed();}
let db=load();function save(){localStorage.setItem(KEY,JSON.stringify(db));}
function current(){return db.users.find(x=>x.id===db.session)||null;}
function customer(){const u=current();return u&&!u.is_admin?u:null;}
function admin(){const u=current();return u&&u.is_admin?u:null;}
function ok(x={}){return {success:true,...x};}
function fail(message){return {success:false,message};}
function ownsRequest(r){return !!customer()&&r.customer_id===customer().id;}
function numbersFor(userId){return db.numbers.filter(n=>n.customer_id===userId);}
function customerRequests(){return db.requests.filter(ownsRequest);}
function seedCustomer(){if(!db.users.some(x=>x.id==="demo-customer"))db.users.push(seed().users[0]);save();}
function addBanner(){
 if(document.getElementById("aman-demo-banner"))return;
 const bar=document.createElement("div");bar.id="aman-demo-banner";bar.dir="rtl";
 bar.innerHTML='<strong>وضع تجريبي — AMAN.C</strong><span>بيانات محلية غير حقيقية، لا يوجد اتصال بقاعدة الإنتاج.</span><button type="button" id="aman-demo-reset">إعادة ضبط التجربة</button>';
 Object.assign(bar.style,{position:"sticky",top:"0",zIndex:"99999",display:"flex",gap:"12px",alignItems:"center",justifyContent:"center",flexWrap:"wrap",padding:"10px",background:"#fff3cd",color:"#594500",borderBottom:"1px solid #e4ca77",font:"14px sans-serif"});
 document.body.prepend(bar);document.getElementById("aman-demo-reset").onclick=()=>{if(confirm("سيتم مسح جميع بيانات التجربة المحلية وإعادتها للبداية. هل تريد المتابعة؟")){localStorage.removeItem(KEY);location.reload();}};
}
function installClient(){
 window.AMANClientServices={
  submitProtectionRequest:async p=>{const u=customer();if(!u)return fail("سجّل الدخول بحساب العميل التجريبي أولًا.");if(!p?.phone||!p?.payment_reference)return fail("بيانات الطلب غير مكتملة.");const company=db.companies.find(x=>x.id===p.company_id)||db.companies[0],pack=db.packages.find(x=>x.id===p.package_id)||db.packages[0],pay=db.payments.find(x=>x.id===p.payment_method_id)||db.payments[0];if(!pack||!pay)return fail("لا توجد باقة أو وسيلة دفع تجريبية.");const r={id:id("REQ"),request_number:"DEMO-"+String(db.requests.length+1).padStart(4,"0"),customer_id:u.id,customer_name:u.full_name,customer_type:u.customer_type,customer_status:u.status,phone:p.phone,company_id:company.id,company_name:company.name,operation_type:p.operation_type||"subscription",package_id:pack.id,package_name:pack.name,duration_days:pack.duration_days,price_yer:pack.price_yer,payment_method_id:pay.id,payment_method_name:pay.name,payment_reference:p.payment_reference,status:"pending",created_at:now(),warnings:[]};db.requests.unshift(r);save();return ok({request_id:r.id});},
  updateProfile:async p=>{const u=customer();if(!u)return fail();u.full_name=String(p.full_name||u.full_name);save();return ok();},
  changePassword:async p=>{const u=customer();if(!u||u.password!==p.current_password)return fail("كلمة المرور الحالية غير صحيحة.");u.password=String(p.new_password);save();return ok();},
  signOut:async()=>{if(!customer())return fail();db.session=null;save();return ok();},
  getNotifications:async()=>ok({items:db.notifications.filter(n=>n.customer_id===customer()?.id)}),
  markNotificationRead:async p=>{const n=db.notifications.find(x=>x.id===p.notification_id&&x.customer_id===customer()?.id);if(!n)return fail();n.read_at=now();save();return ok();},
  getNumberAlertPreferences:async p=>db.alerts.find(x=>x.customer_id===customer()?.id&&x.phone===p.phone)||{before_due:false,protection_expiry:true,status_change:true,channel:"in_app"},
  updateNumberAlertPreferences:async p=>{if(!customer())return fail();let a=db.alerts.find(x=>x.customer_id===customer().id&&x.phone===p.phone);if(!a){a={customer_id:customer().id,phone:p.phone};db.alerts.push(a);}Object.assign(a,p);save();return ok();},
  submitReport:async p=>{const r={id:id("RPT"),customer_id:customer()?.id||null,...p,status:"open",created_at:now()};db.reports.unshift(r);save();return ok({report_id:r.id});}
 };
 document.addEventListener("DOMContentLoaded",()=>{if(window.AMANClientData){window.AMANClientData.setProtectionCatalog(db.packages,db.payments);if(customer()){window.AMANClientData.setNumbers(numbersFor(customer().id));window.AMANClientData.setOperations(customerRequests());}}});
 function sync(){const u=customer();if(!u)return;window.AMANClientData.setNumbers(numbersFor(u.id));window.AMANClientData.setOperations(customerRequests());}
 document.addEventListener("submit",e=>{
  if(e.target.id==="auth-form"){e.preventDefault();e.stopImmediatePropagation();const email=document.getElementById("auth-email").value.trim().toLowerCase(),password=document.getElementById("auth-password").value;let u=db.users.find(x=>x.email.toLowerCase()===email&&x.password===password&&!x.is_admin);if(!u&&document.getElementById("auth-title")?.textContent.includes("إنشاء")){if(db.users.some(x=>x.email.toLowerCase()===email)){alert("البريد مستخدم بالفعل.");return;}u={id:id("CUS"),full_name:email.split("@")[0],email,password,status:"active",customer_type:"user"};db.users.push(u);}if(!u){alert("بيانات الدخول غير صحيحة. استخدم customer@aman.demo / 1234");return;}db.session=u.id;save();sync();location.reload();}
  if(e.target.id==="search-form"){e.preventDefault();e.stopImmediatePropagation();const phone=document.getElementById("phone-search").value.replace(/\D/g,"");const n=db.numbers.find(x=>x.phone===phone);const msg=document.getElementById("search-message");if(n&&customer()&&n.customer_id===customer().id){window.AMANClientData.showSearchResult(n);msg.textContent="هذا الرقم مرتبط بحسابك في البيئة التجريبية.";}else{msg.textContent="الرقم غير محمي في بيانات التجربة. يمكنك تقديم طلب حماية بعد تسجيل الدخول وإضافة الرقم من مسار العميل المتاح.";} }
 },true);
 document.addEventListener("DOMContentLoaded",()=>{if(customer()){sync();const name=document.getElementById("profile-name");if(name)name.value=customer().full_name;}});
}
function installAdmin(){
 window.AMANAdminServices={
  getCurrentAdmin:async()=>admin()?ok({admin:{...admin(),is_admin:true}}):fail(),
  signInAdmin:async p=>{const u=db.users.find(x=>x.email===p.email&&x.password===p.password&&x.is_admin===true);if(!u)return fail("بيانات المدير التجريبي غير صحيحة.");db.session=u.id;save();return ok({admin:{...u,is_admin:true}});},
  signOutAdmin:async()=>{if(!admin())return fail();db.session=null;save();return ok();},
  getDashboardSummary:async()=>ok({summary:{pending_requests:db.requests.filter(x=>x.status==="pending").length,protected_numbers:db.numbers.length,open_reports:db.reports.filter(x=>x.status==="open").length,due_tasks:db.tasks.filter(x=>x.status==="due").length,customers:db.users.filter(x=>!x.is_admin&&x.customer_type==="customer").length,approved_revenue_yer:db.requests.filter(x=>x.status==="approved").reduce((a,x)=>a+Number(x.price_yer||0),0)}}),
  listRequests:async f=>{if(!admin())return fail();let a=[...db.requests];if(f?.status&&f.status!=="all")a=a.filter(x=>x.status===f.status);if(f?.operation_type&&f.operation_type!=="all")a=a.filter(x=>x.operation_type===f.operation_type);if(f?.company_id&&f.company_id!=="all")a=a.filter(x=>x.company_id===f.company_id);if(f?.search)a=a.filter(x=>(x.phone+x.request_number+x.customer_name).includes(f.search));return ok({requests:a,companies:db.companies});},
  getRequestDetails:async p=>{if(!admin())return fail();const r=db.requests.find(x=>x.id===p.request_id);return r?ok({request:{...r,number_status:"غير محمي"}}):fail();},
  getApprovalPreview:async p=>{if(!admin())return fail();const r=db.requests.find(x=>x.id===p.request_id&&x.status==="pending");if(!r)return fail("الطلب لم يعد قيد المراجعة.");const start=new Date(),end=new Date(start.getTime()+r.duration_days*86400000);return ok({preview:{starts_at:start.toISOString(),ends_at:end.toISOString(),effect_description:"إنشاء فترة حماية تجريبية بعد اعتماد الطلب."}});},
  getRejectReasons:async()=>ok({items:[{code:"payment_unverified",label:"مرجع الدفع غير مطابق"},{code:"invalid_data",label:"بيانات غير صحيحة"},{code:"other",label:"سبب آخر"}]}),
  approveRequest:async p=>{if(!admin())return fail();const r=db.requests.find(x=>x.id===p.request_id);if(!r||r.status!=="pending")return fail("الطلب غير متاح للاعتماد.");r.status="approved";r.approved_at=now();const u=db.users.find(x=>x.id===r.customer_id);if(u)u.customer_type="customer";let n=db.numbers.find(x=>x.phone===r.phone&&x.customer_id===r.customer_id);if(!n){n={id:id("NUM"),customer_id:r.customer_id,phone:r.phone,company_id:r.company_id,company:r.company_name,status:"protected",protection_status:"protected",protection_start:now(),protection_end:new Date(Date.now()+r.duration_days*86400000).toISOString()};db.numbers.push(n);}else{n.status="protected";n.protection_end=new Date(Date.now()+r.duration_days*86400000).toISOString();}db.notifications.unshift({id:id("NTF"),customer_id:r.customer_id,title:"تم اعتماد طلب الحماية",body:"تم اعتماد طلبك التجريبي للرقم "+r.phone,created_at:now(),read_at:null});db.tasks.push({id:id("TSK"),phone:r.phone,customer_id:r.customer_id,status:"upcoming",due_at:n.protection_end});save();return ok();},
  rejectRequest:async p=>{if(!admin())return fail();const r=db.requests.find(x=>x.id===p.request_id);if(!r||r.status!=="pending"||!p.reason_code)return fail("الطلب غير متاح أو سبب الرفض مفقود.");r.status="rejected";r.reject_reason=p.reason_code;r.reject_explanation=p.explanation||"";r.rejected_at=now();db.notifications.unshift({id:id("NTF"),customer_id:r.customer_id,title:"تم رفض طلب الحماية",body:"تم رفض طلبك التجريبي للرقم "+r.phone,created_at:now(),read_at:null});save();return ok();},
  listNumbers:async p=>{if(!admin())return fail();let a=[...db.numbers];if(p?.search)a=a.filter(x=>x.phone.includes(p.search));if(p?.status&&p.status!=="all")a=a.filter(x=>x.status===p.status);return ok({numbers:a});},
  getNumberDetails:async p=>{if(!admin())return fail();const n=db.numbers.find(x=>x.id===p.number_id);return n?ok({number:{...n,events:[],requests:db.requests.filter(r=>r.phone===n.phone),tasks:db.tasks.filter(t=>t.phone===n.phone)}}):fail();}
 };
}
function exposeLoginHints(){const box=document.createElement("div");box.dir="rtl";box.style.cssText="max-width:520px;margin:14px auto;padding:14px;border:1px dashed #b9c7d2;border-radius:12px;background:#f5f8fa;color:#263746;font:14px/1.8 sans-serif";box.innerHTML="<strong>حسابات التجربة</strong><br>مدير: <b dir='ltr'>admin@aman.demo</b> — كلمة المرور: <b>1234</b><br>عميل: <b dir='ltr'>customer@aman.demo</b> — كلمة المرور: <b>1234</b>";const target=document.querySelector(".auth-card")||document.querySelector("#admin-login .surface")||document.querySelector("#admin-login");if(target)target.append(box);}
addBanner();if(location.pathname.includes("/admin/")){installAdmin();exposeLoginHints();}else{installClient();exposeLoginHints();}
})();