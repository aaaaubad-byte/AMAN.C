(() => {
"use strict";

const screenIds=["home","numbers","operations","operation-detail","protection","review","result","account","notifications","auth"];
const screens=Object.fromEntries(screenIds.map(id=>[id,document.getElementById(id+"-screen")]));
const tabs=[...document.querySelectorAll("[data-tab]")];
const numberSheet=document.getElementById("number-sheet");
const operationSheet=document.getElementById("operation-sheet");
let currentScreen="home";
let previousScreen="home";
let numbers=[];
let operations=[];
let currentNumber=null;
let currentOperation=null;
let protectionContext=null;
let protectionCatalog={packages:[],paymentMethods:[]};
let protectionSubmitting=false;
let protectionReturnScreen="home";
const tabForScreen={home:"home",numbers:"numbers",operations:"operations"};
const numberStatusLabels={protected:"محمي",inactive:"غير نشط",confiscated:"منتهي-مصادر"};
const requestStatusLabels={pending:"قيد المراجعة",approved:"معتمد",rejected:"مرفوض"};
const operationTypeLabels={activation:"اشتراك",extension:"تمديد الاشتراك",reactivation:"تنشيط",subscribe:"اشتراك",extend:"تمديد الاشتراك",renew:"تنشيط"};

const normalizeDigits=value=>String(value??"")
 .replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
 .replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const text=(value,fallback="—")=>value===null||value===undefined||value===""?fallback:String(value);

function navigate(name,{scroll=true,remember=true}={}){
 if(!screens[name])return false;
 if(remember&&name!==currentScreen)previousScreen=currentScreen;
 currentScreen=name;
 Object.entries(screens).forEach(([key,node])=>{if(node)node.hidden=key!==name;});
 tabs.forEach(node=>node.classList.toggle("active",node.dataset.tab===tabForScreen[name]));
 closeNumberSheet();closeOperationSheet();
 if(scroll)window.scrollTo({top:0,behavior:"smooth"});
 document.dispatchEvent(new CustomEvent("aman:screenchange",{detail:{screen:name,previous:previousScreen}}));
 return true;
}
function backToPrevious(){navigate(previousScreen||"home",{remember:false});}
window.AMANClientNavigation=Object.freeze({navigate,back:backToPrevious,get current(){return currentScreen;},get previous(){return previousScreen;}});
tabs.forEach(node=>node.addEventListener("click",()=>navigate(node.dataset.tab)));
document.querySelectorAll("[data-navigate]").forEach(node=>node.addEventListener("click",()=>navigate(node.dataset.navigate)));
document.querySelectorAll("[data-back]").forEach(node=>node.addEventListener("click",()=>backToPrevious()));
document.getElementById("show-all-numbers").addEventListener("click",()=>navigate("numbers"));
document.getElementById("account-button").addEventListener("click",()=>navigate("account"));
document.getElementById("notifications-button").addEventListener("click",()=>navigate("notifications"));
document.getElementById("open-login").addEventListener("click",()=>navigate("auth"));
document.querySelector(".brand").addEventListener("click",event=>{event.preventDefault();navigate("home");});

function setMessage(node,message,kind="error"){
 if(!node)return;
 node.textContent=message;
 node.className=kind==="success"?"notice-success":kind==="info"?"notice-info":"notice-error";
}
function closeNumberSheet(){if(numberSheet)numberSheet.hidden=true;currentNumber=null;}
function closeOperationSheet(){if(operationSheet)operationSheet.hidden=true;currentOperation=null;}
document.getElementById("close-sheet").addEventListener("click",closeNumberSheet);
document.getElementById("sheet-done").addEventListener("click",closeNumberSheet);
numberSheet.addEventListener("click",event=>{if(event.target===numberSheet)closeNumberSheet();});
document.getElementById("close-operation-sheet").addEventListener("click",closeOperationSheet);
document.getElementById("operation-sheet-done").addEventListener("click",closeOperationSheet);
operationSheet.addEventListener("click",event=>{if(event.target===operationSheet)closeOperationSheet();});
document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeNumberSheet();closeOperationSheet();}});

function renderNumberDetails(number){
 const status=number.status;
 const labels={protected:"محمي",inactive:"غير نشط",confiscated:"منتهي-مصادر",other_protected:"محمي"};
 document.getElementById("sheet-title").textContent="تفاصيل الرقم";
 document.getElementById("sheet-phone").textContent=text(number.phone);
 const statusNode=numberSheet.querySelector(".state");
 statusNode.textContent=labels[status]||"غير متاح";
 statusNode.className="state "+(status==="protected"?"state-active":status==="inactive"?"state-wait":status==="confiscated"?"state-expired":"state-off");
 const company=text(number.company);
 let rows=[["شركة الاتصالات",company]];
 if(status==="protected"){
  rows.push(["باقة الحماية",text(number.package_name)],["مدة الحماية",number.duration_days?number.duration_days+" يوم":"—"],["بداية الحماية",text(number.starts_at)],["نهاية الحماية",text(number.ends_at)],["المدة المتبقية",text(number.remaining_label)]);
 }else if(status==="inactive"||status==="confiscated"){
  rows.push(["الباقة السابقة",text(number.package_name)],["بداية الفترة السابقة",text(number.starts_at)],["تاريخ الانتهاء",text(number.ends_at)]);
  if(status==="inactive")rows.push(["آخر يوم للتنشيط",text(number.last_activation_date)]);
 }
 document.getElementById("sheet-details-extra").innerHTML=rows.map(([label,value])=>'<div class="detail-block"><div class="detail-label">'+escapeHtml(label)+'</div><div class="detail-value">'+escapeHtml(value)+'</div></div>').join("");
 const privacy=document.getElementById("sheet-privacy-note");
 const actions=document.getElementById("sheet-actions");
 actions.innerHTML="";
 if(status==="other_protected"){
  privacy.hidden=false;
  privacy.textContent="هذا الرقم محمي حاليًا لدى عميل آخر. لا يمكن عرض أي بيانات تخص ذلك العميل.";
  const report=document.createElement("button");report.className="btn btn-block";report.type="button";report.textContent="تقديم بلاغ";
  report.addEventListener("click",()=>setMessage(privacy,"تقديم البلاغ غير متاح حتى ربط الخدمة الخلفية.","info"));
  actions.append(report);
 }else{
  privacy.hidden=false;
  privacy.textContent=status==="confiscated"?"انتهت مهلة التنشيط وفق بيانات أمان. لا يتاح إجراء التنشيط.":status==="inactive"?"انتهت فترة الحماية السابقة؛ يتاح التنشيط إذا أكدت البيانات المعتمدة ذلك.":status==="protected"?"الرقم مشمول بالحماية لدى حسابك.":"الرقم غير مشمول حاليًا بحماية أمان.";
  const actionType=status==="protected"?"extension":status==="inactive"?"reactivation":status==="not_subscribed"?"activation":null;
  if(actionType){
   const action=document.createElement("button");action.className="btn btn-block";action.type="button";
   action.textContent=operationTypeLabels[actionType];
   action.addEventListener("click",()=>openProtection(number,actionType));
   actions.append(action);
  }
 }
 numberSheet.hidden=false;
}
function openNumberDetails(number,source="numbers"){
 if(!number||!number.phone)return false;
 previousScreen=source;
 currentNumber=number;
 renderNumberDetails(number);
 return true;
}


function renderHomeNumbers(){
 const host=document.getElementById("my-numbers");
 if(!numbers.length){host.innerHTML='<div class="soft-surface empty-state"><div class="empty-icon">▦</div><strong>لا توجد أرقام مرتبطة بحسابك</strong><p>ستظهر أرقامك هنا بعد اعتماد طلب الاشتراك من إدارة أمان.</p></div>';return;}
 host.innerHTML=numbers.slice(0,3).map((item,index)=>'<button class="phone-card" type="button" data-home-number-index="'+index+'"><span class="phone-icon">▦</span><span class="phone-info"><strong dir="ltr">'+escapeHtml(item.phone)+'</strong><small>'+escapeHtml(text(item.company))+'</small></span><span class="state '+(item.status==="protected"?"state-active":item.status==="inactive"?"state-wait":"state-expired")+'">'+escapeHtml(numberStatusLabels[item.status]||"—")+'</span></button>').join("");
 host.querySelectorAll("[data-home-number-index]").forEach(button=>button.addEventListener("click",()=>openNumberDetails(numbers[Number(button.dataset.homeNumberIndex)],"home")));
}

function renderNumbers(){
 const list=document.getElementById("numbers-list");
 const query=normalizeDigits(document.getElementById("numbers-search").value).replace(/\D/g,"");
 const company=document.getElementById("numbers-company-filter").value;
 const status=document.getElementById("numbers-status-filter").value;
 const filtered=numbers.filter(item=>(!query||normalizeDigits(item.phone).includes(query))&&(!company||item.company_id===company)&&(!status||item.status===status));
 if(!numbers.length){list.innerHTML='<div class="soft-surface empty-state"><div class="empty-icon">▦</div><strong>لا توجد أرقام بعد</strong><p>تظهر هنا الأرقام بعد اعتماد طلب الاشتراك. البحث عن رقم لا يضيفه إلى قائمتك.</p></div>';return;}
 if(!filtered.length){list.innerHTML='<div class="soft-surface empty-state"><div class="empty-icon">⌕</div><strong>لا توجد نتائج مطابقة</strong><p>غيّر عبارة البحث أو خيارات التصفية.</p></div>';return;}
 list.innerHTML=filtered.map((item,index)=>'<button class="phone-card" type="button" data-number-index="'+numbers.indexOf(item)+'"><span class="phone-icon">▦</span><span class="phone-info"><strong dir="ltr">'+escapeHtml(item.phone)+'</strong><small>'+escapeHtml(text(item.company))+(item.remaining_label?" · "+escapeHtml(item.remaining_label):item.ends_at?" · ينتهي "+escapeHtml(item.ends_at):"")+'</small></span><span class="state '+(item.status==="protected"?"state-active":item.status==="inactive"?"state-wait":"state-expired")+'">'+escapeHtml(numberStatusLabels[item.status]||"—")+'</span></button>').join("");
 list.querySelectorAll("[data-number-index]").forEach(button=>button.addEventListener("click",()=>openNumberDetails(numbers[Number(button.dataset.numberIndex)],"numbers")));
}
function updateCompanyFilter(){
 const select=document.getElementById("numbers-company-filter");
 const current=select.value;
 const companies=[...new Map(numbers.filter(n=>n.company_id&&n.company).map(n=>[n.company_id,n.company])).entries()];
 select.innerHTML='<option value="">كل الشركات</option>'+companies.map(([id,name])=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(name)+'</option>').join("");
 if(companies.some(([id])=>id===current))select.value=current;
}
["numbers-search","numbers-company-filter","numbers-status-filter"].forEach(id=>document.getElementById(id).addEventListener("input",renderNumbers));
document.getElementById("clear-numbers-search").addEventListener("click",()=>{document.getElementById("numbers-search").value="";renderNumbers();});
document.getElementById("clear-numbers-search").addEventListener("click",()=>document.getElementById("numbers-search").focus());

function renderOperations(){
 const list=document.getElementById("operations-list");
 const query=normalizeDigits(document.getElementById("operations-search").value);
 const status=document.getElementById("operations-status-filter").value;
 const filtered=operations.filter(item=>(!query||normalizeDigits(item.phone).includes(query)||String(item.id||"").includes(query))&&(!status||item.status===status));
 if(!operations.length){list.innerHTML='<div class="soft-surface empty-state"><div class="empty-icon">◷</div><strong>لا توجد عمليات حتى الآن</strong><p>ستظهر طلباتك هنا بعد إرسالها، ولن تبدأ الحماية إلا بعد اعتماد طلب الاشتراك.</p></div>';return;}
 if(!filtered.length){list.innerHTML='<div class="soft-surface empty-state"><div class="empty-icon">⌕</div><strong>لا توجد نتائج مطابقة</strong><p>لا توجد عملية تطابق البحث أو حالة الطلب المحددة.</p></div>';return;}
 list.innerHTML=filtered.map(item=>'<button class="operation-card" type="button" data-operation-index="'+operations.indexOf(item)+'"><span class="operation-main"><strong>'+escapeHtml(operationTypeLabels[item.type]||"عملية حماية")+'</strong><small dir="ltr">'+escapeHtml(text(item.phone))+'</small><small>'+escapeHtml(text(item.created_at))+'</small></span><span class="operation-side"><b class="state '+(item.status==="approved"?"state-active":item.status==="rejected"?"state-expired":"state-wait")+'">'+escapeHtml(requestStatusLabels[item.status]||"—")+'</b><strong>'+escapeHtml(item.price_yer===undefined?"—":Number(item.price_yer).toLocaleString("ar")+" ر.ي")+'</strong></span></button>').join("");
 list.querySelectorAll("[data-operation-index]").forEach(button=>button.addEventListener("click",()=>openOperationDetails(operations[Number(button.dataset.operationIndex)])));
}
document.getElementById("operations-search").addEventListener("input",renderOperations);
document.getElementById("operations-status-filter").addEventListener("change",renderOperations);

function openOperationDetails(item){
 if(!item)return false;
 currentOperation=item;
 const rows=[
  ["رقم الطلب",text(item.id)],["نوع العملية",operationTypeLabels[item.type]||"—"],["رقم الهاتف",text(item.phone)],
  ["شركة الاتصالات",text(item.company)],["الباقة",text(item.package_name)],["المدة",item.duration_days?item.duration_days+" يوم":"—"],
  ["السعر",item.price_yer===undefined?"—":Number(item.price_yer).toLocaleString("ar")+" ر.ي"],["وسيلة الدفع",text(item.payment_method)],
  ["مرجع الدفع",text(item.payment_reference)],["تاريخ الطلب",text(item.created_at)],["حالة الطلب",requestStatusLabels[item.status]||"—"]
 ];
 if(item.status==="rejected"&&item.rejection_reason)rows.push(["سبب الرفض",item.rejection_reason]);
 const content=document.getElementById("operation-detail-content");
 content.innerHTML=rows.map(([label,value])=>'<div class="detail-block"><div class="detail-label">'+escapeHtml(label)+'</div><div class="detail-value">'+escapeHtml(value)+'</div></div>').join("");
 const actions=document.createElement("div");actions.className="detail-actions";
 [["نسخ رقم الطلب",item.id],["نسخ مرجع الدفع",item.payment_reference]].filter(pair=>pair[1]).forEach(([label,value])=>{
  const button=document.createElement("button");button.className="btn btn-outline";button.type="button";button.textContent=label;
  button.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(String(value));button.textContent="تم النسخ";}catch{button.textContent="تعذر النسخ";}});
  actions.append(button);
 });
 content.append(actions);
 navigate("operation-detail");
 return true;
}

function allowedOperationForNumber(number){
 if(number.status==="protected")return "extension";
 if(number.status==="inactive")return "reactivation";
 if(number.status==="not_subscribed")return "activation";
 return null;
}
function openProtection(number,type){
 if(!number||allowedOperationForNumber(number)!==type)return false;
 protectionContext={phone:number.phone,company:number.company,company_id:number.company_id,type,number};
 protectionReturnScreen=currentScreen;
 document.getElementById("protection-phone").textContent=number.phone;
 document.getElementById("protection-company").textContent=text(number.company);
 document.getElementById("protection-type").textContent=operationTypeLabels[type];
 populateProtectionCatalog();
 document.getElementById("protection-message").textContent="";
 document.getElementById("payment-reference").value="";
 navigate("protection");
 return true;
}
function populateProtectionCatalog(){
 const ps=document.getElementById("protection-package"),ms=document.getElementById("protection-payment");
 const packages=protectionCatalog.packages.filter(p=>p&&p.active!==false&&p.id&&p.name&&Number.isFinite(Number(p.duration_days))&&Number(p.duration_days)>0&&Number.isFinite(Number(p.price_yer))&&String(p.company_id)===String(protectionContext?.company_id)&&p.operation_type===protectionContext?.type);
 const methods=protectionCatalog.paymentMethods.filter(p=>p&&p.active!==false&&p.id&&p.name);
 ps.innerHTML='<option value="">اختر الباقة المتاحة</option>'+packages.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.name)+' — '+escapeHtml(p.duration_days)+' يوم — '+escapeHtml(Number(p.price_yer).toLocaleString("ar"))+' ر.ي</option>').join("");
 ms.innerHTML='<option value="">اختر وسيلة الدفع</option>'+methods.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.name)+'</option>').join("");
 document.getElementById("package-summary").textContent=packages.length?"اختر باقة معتمدة لهذه الشركة ونوع العملية.":"لا توجد باقات معتمدة متاحة حاليًا لهذه الشركة ونوع العملية.";
 document.getElementById("payment-instructions").textContent="تعليمات الدفع المعتمدة ستظهر بعد اختيار الوسيلة.";
}
document.getElementById("protection-package").addEventListener("change",event=>{
 const p=protectionCatalog.packages.find(x=>String(x.id)===event.target.value);
 document.getElementById("package-summary").textContent=p?("المدة: "+p.duration_days+" يوم — السعر: "+Number(p.price_yer).toLocaleString("ar")+" ر.ي"):"اختر الباقة المعتمدة.";
});
document.getElementById("protection-payment").addEventListener("change",event=>{
 const p=protectionCatalog.paymentMethods.find(x=>String(x.id)===event.target.value);
 document.getElementById("payment-instructions").textContent=p?text(p.instructions,"لا توجد تعليمات إضافية."):"تعليمات الدفع المعتمدة ستظهر بعد اختيار الوسيلة.";
});
document.getElementById("protection-form").addEventListener("submit",event=>{
 event.preventDefault();
 const p=protectionCatalog.packages.find(x=>String(x.id)===document.getElementById("protection-package").value);
 const m=protectionCatalog.paymentMethods.find(x=>String(x.id)===document.getElementById("protection-payment").value);
 const ref=document.getElementById("payment-reference").value.trim();
 if(!p||!m||!ref){setMessage(document.getElementById("protection-message"),"أكمل اختيار الباقة ووسيلة الدفع وأدخل مرجع الدفع.");return;}
 protectionContext={...protectionContext,package:p,paymentMethod:m,paymentReference:ref};
 const rows=[["الرقم",protectionContext.phone],["الشركة",protectionContext.company],["نوع العملية",operationTypeLabels[protectionContext.type]],["الباقة",p.name],["المدة",p.duration_days+" يوم"],["السعر",Number(p.price_yer).toLocaleString("ar")+" ر.ي"],["وسيلة الدفع",m.name],["مرجع الدفع",ref]];
 document.getElementById("review-details").innerHTML=rows.map(([a,b])=>'<div class="review-row"><span>'+escapeHtml(a)+'</span><strong>'+escapeHtml(b)+'</strong></div>').join("");
 document.getElementById("review-message").textContent="";
 navigate("review");
});
document.getElementById("confirm-protection").addEventListener("click",async()=>{
 const button=document.getElementById("confirm-protection"),message=document.getElementById("review-message");
 if(protectionSubmitting)return;
 const service=window.AMANClientServices;
 if(!service||typeof service.submitProtectionRequest!=="function"){setMessage(message,"إرسال الطلب غير متاح بعد؛ خدمة الطلبات الآمنة غير مربوطة. لم تُرسل أي بيانات.");return;}
 protectionSubmitting=true;button.disabled=true;button.textContent="جارٍ الإرسال…";
 try{
  const result=await service.submitProtectionRequest({phone:protectionContext.phone,company_id:protectionContext.company_id,operation_type:protectionContext.type,package_id:protectionContext.package.id,payment_method_id:protectionContext.paymentMethod.id,payment_reference:protectionContext.paymentReference});
  const ok=Boolean(result&&result.success===true&&result.request_id);
  document.getElementById("result-title").textContent=ok?"تم إرسال الطلب":"تعذر تأكيد إرسال الطلب";
  document.getElementById("result-description").textContent=ok?"استلمت أمان طلبك وهو قيد المراجعة. لا تبدأ الحماية إلا بعد اعتماد الإدارة.":"لم يصل تأكيد موثوق من الخادم. تحقق من قائمة العمليات قبل إعادة المحاولة.";
  document.getElementById("result-content").innerHTML=ok?'<div class="result-success"><strong>طلبك قيد المراجعة</strong><div class="detail-label">رقم الطلب</div><div class="detail-value" dir="ltr">'+escapeHtml(result.request_id)+'</div></div>':'<div class="alert-note">'+escapeHtml(text(result?.message,"لم يتم تأكيد النتيجة."))+'</div>';
  navigate("result");
 }catch(error){
  document.getElementById("result-title").textContent="تعذر تأكيد النتيجة";
  document.getElementById("result-description").textContent="انقطع الاتصال أو تعذر تأكيد استلام الطلب. تحقق من قائمة العمليات قبل إعادة المحاولة.";
  document.getElementById("result-content").innerHTML='<div class="alert-note">لم نتلق تأكيدًا موثوقًا من الخادم. لا نؤكد إنشاء الطلب.</div>';
  navigate("result");
 }finally{protectionSubmitting=false;button.disabled=false;button.textContent="تأكيد وإرسال الطلب";}
});
document.getElementById("result-to-operations").addEventListener("click",()=>navigate("operations"));
document.getElementById("result-to-number").addEventListener("click",()=>{if(protectionContext?.number)openNumberDetails(protectionContext.number,protectionReturnScreen);else navigate(protectionReturnScreen||"home");});

function setNumbers(items){
 numbers=Array.isArray(items)?items.filter(item=>item&&item.phone&&numberStatusLabels[item.status]):[];
 updateCompanyFilter();renderNumbers();renderHomeNumbers();
 document.dispatchEvent(new CustomEvent("aman:numbers-updated",{detail:{count:numbers.length}}));
}
function setOperations(items){
 operations=Array.isArray(items)?items.filter(item=>item&&requestStatusLabels[item.status]):[];
 renderOperations();
 document.dispatchEvent(new CustomEvent("aman:operations-updated",{detail:{count:operations.length}}));
}
window.AMANClientData=Object.freeze({setNumbers,setOperations,openNumberDetails,openOperationDetails,showSearchResult:number=>openNumberDetails(number,"home"),setProtectionCatalog:(packages,paymentMethods)=>{protectionCatalog={packages:Array.isArray(packages)?packages:[],paymentMethods:Array.isArray(paymentMethods)?paymentMethods:[]};if(protectionContext)populateProtectionCatalog();}});

const normalizePhone=value=>normalizeDigits(value).replace(/[^0-9]/g,"");
document.getElementById("search-form").addEventListener("submit",event=>{
 event.preventDefault();
 const input=document.getElementById("phone-search");
 const message=document.getElementById("search-message");
 const phone=normalizePhone(input.value);
 if(!phone){setMessage(message,"أدخل رقم الهاتف بصيغته المحلية.");input.focus();return;}
 if(phone.length<7||phone.length>15){setMessage(message,"تحقق من طول الرقم المدخل.");input.focus();return;}
 const submit=event.currentTarget.querySelector('button[type="submit"]');
 submit.disabled=true;
 setMessage(message,"جارٍ التحقق من الرقم…","info");
 window.setTimeout(()=>{
  setMessage(message,"تعذر التحقق من الرقم لأن خدمة البحث وقاعدة البيانات غير مرتبطتين بعد. لم تتم إضافة الرقم إلى أرقامك.","error");
  submit.disabled=false;
 },350);
});
document.getElementById("phone-search").addEventListener("input",event=>{
 event.target.value=normalizeDigits(event.target.value).replace(/[^0-9٠-٩۰-۹]/g,"");
 document.getElementById("search-message").textContent="";
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
 setMessage(document.getElementById("auth-message"),"لم يتم إرسال بياناتك. يلزم ربط خدمة المصادقة الآمنة قبل تفعيل الدخول وإنشاء الحساب.");
});

renderNumbers();renderHomeNumbers();renderOperations();navigate("home",{scroll:false,remember:false});
})();