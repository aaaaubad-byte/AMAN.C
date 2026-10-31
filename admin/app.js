(() => {
  "use strict";
  const list = document.getElementById("customer-list");
  const count = document.getElementById("customer-count");
  const message = document.getElementById("admin-message");
  const refresh = document.getElementById("refresh-button");
  const clear = document.getElementById("clear-button");
  if (!list || !count || !window.AmanStorage) {
    if (list) list.textContent = "تعذر تحميل مكونات الإدارة. أعد تحميل الصفحة.";
    return;
  }
  function render() {
    let customers;
    try {
      customers = window.AmanStorage.getCustomers();
    } catch (error) {
      list.textContent = "تعذر قراءة التخزين المحلي.";
      return;
    }
    count.textContent = String(customers.length);
    list.replaceChildren();
    if (!customers.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "لا توجد سجلات. أضف عميلًا تجريبيًا من واجهة العميل أولًا.";
      list.append(empty);
      return;
    }
    customers.forEach((customer) => {
      const item = document.createElement("article");
      item.className = "customer-item";
      const name = document.createElement("strong");
      name.textContent = customer.name;
      const phone = document.createElement("span");
      phone.textContent = "رقم الهاتف: " + customer.phone;
      const date = document.createElement("small");
      date.textContent = "وقت التسجيل: " + new Date(customer.createdAt).toLocaleString("ar");
      item.append(name, phone, date);
      list.append(item);
    });
  }
  refresh.addEventListener("click", render);
  clear.addEventListener("click", () => {
    if (!window.confirm("هل تريد حذف جميع سجلات الاختبار المحفوظة في هذا المتصفح؟")) return;
    window.AmanStorage.clearCustomers();
    message.textContent = "حُذفت سجلات الاختبار من هذا المتصفح.";
    render();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === window.AmanStorage.key) render();
  });
  render();
})();