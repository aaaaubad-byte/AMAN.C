import { getCustomers } from "../shared/storage.js";
const list=document.querySelector("#customers");
const count=document.querySelector("#count");
function render(){
 const customers=getCustomers();
 count.textContent=customers.length+" عميل";
 list.replaceChildren();
 if(!customers.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="لا يوجد عملاء بعد. سجّل عميلًا من واجهة العميل أولًا.";list.append(empty);return;}
 for(const customer of customers){
  const card=document.createElement("article");card.className="customer";
  const name=document.createElement("strong");name.textContent=customer.name;
  const phone=document.createElement("small");phone.textContent="رقم الهاتف: "+customer.phone;
  const date=document.createElement("small");date.textContent="تاريخ التسجيل: "+new Date(customer.createdAt).toLocaleString("ar");
  card.append(name,phone,document.createElement("br"),date);list.append(card);
 }
}
document.querySelector("#refresh").addEventListener("click",render);
window.addEventListener("storage",render);
render();