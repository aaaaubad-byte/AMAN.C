const KEY="aman_test_customers_v1";
export function getCustomers(){
 try{const value=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(value)?value:[];}
 catch{return [];}
}
export function addCustomer({name,phone}){
 const customers=getCustomers();
 if(customers.some(item=>item.phone===phone))throw new Error("هذا الرقم مسجل مسبقًا في بيانات الاختبار.");
 const record={id:globalThis.crypto?.randomUUID?.()||String(Date.now()),name,phone,createdAt:new Date().toISOString()};
 customers.unshift(record);
 localStorage.setItem(KEY,JSON.stringify(customers));
 return record;
}
export function clearTestCustomers(){localStorage.removeItem(KEY);}