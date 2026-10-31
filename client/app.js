(() => {
  "use strict";
  const form = document.getElementById("customer-form");
  const message = document.getElementById("client-message");
  if (!form || !message || !window.AmanStorage) {
    if (message) message.textContent = "تعذر تحميل مكونات الصفحة. أعد تحميلها وأبلغنا بالنتيجة.";
    return;
  }
  try {
    window.AmanStorage.getCustomers();
    message.textContent = "التخزين المحلي جاهز. يمكنك إدخال سجل تجريبي.";
  } catch (error) {
    message.textContent = "المتصفح لا يسمح بالتخزين المحلي في هذه الصفحة.";
    form.querySelector("button").disabled = true;
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    if (name.length < 2 || phone.replace(/\D/g, "").length < 6) {
      message.textContent = "أدخل اسمًا من حرفين على الأقل ورقمًا تجريبيًا من 6 أرقام على الأقل.";
      return;
    }
    try {
      window.AmanStorage.addCustomer({ name, phone });
      message.textContent = "نجح الحفظ. افتح واجهة الإدارة في هذا المتصفح وتحقق من ظهور السجل.";
      form.reset();
    } catch (error) {
      message.textContent = error.message || "تعذر حفظ السجل.";
    }
  });
})();