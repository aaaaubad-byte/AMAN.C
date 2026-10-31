(() => {
  "use strict";
  const list = document.getElementById("number-list");
  const count = document.getElementById("number-count");
  const message = document.getElementById("admin-message");
  const refresh = document.getElementById("refresh-button");
  const clear = document.getElementById("clear-button");
  if (!list || !count || !window.AmanStorage) {
    if (list) list.textContent = "تعذر تحميل مكونات الإدارة. أعد تحميل الصفحة.";
    return;
  }
  function render() {
    let numbers;
    try {
      numbers = window.AmanStorage.getNumbers();
    } catch (error) {
      list.textContent = "تعذرت قراءة التخزين المحلي.";
      return;
    }
    count.textContent = String(numbers.length);
    list.replaceChildren();
    if (!numbers.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "لا توجد أرقام حتى الآن. أضف رقمًا من واجهة العميل أولًا.";
      list.append(empty);
      return;
    }
    numbers.forEach((number, index) => {
      const item = document.createElement("article");
      item.className = "customer-item";
      const title = document.createElement("strong");
      title.textContent = "رقم " + (index + 1);
      const phone = document.createElement("span");
      phone.textContent = number.phone;
      const date = document.createElement("small");
      date.textContent = number.createdAt
        ? "وقت الإضافة: " + new Date(number.createdAt).toLocaleString("ar")
        : "رقم محفوظ سابقًا";
      item.append(title, phone, date);
      list.append(item);
    });
  }
  refresh.addEventListener("click", render);
  clear.addEventListener("click", () => {
    if (!window.confirm("هل تريد حذف جميع أرقام الاختبار المحفوظة في هذا المتصفح؟")) return;
    window.AmanStorage.clearNumbers();
    message.textContent = "حُذفت جميع أرقام الاختبار.";
    render();
  });
  window.addEventListener("storage", event => {
    if (event.key === window.AmanStorage.key) render();
  });
  window.addEventListener("aman:numbers-changed", render);
  render();
})();