(() => {
  "use strict";
  const form = document.getElementById("number-form");
  const message = document.getElementById("client-message");
  if (!form || !message || !window.AmanStorage) {
    if (message) message.textContent = "تعذر تحميل مكونات الصفحة. أعد تحميلها وأبلغنا بالنتيجة.";
    return;
  }
  try {
    window.AmanStorage.getNumbers();
    message.textContent = "التخزين المحلي جاهز. يمكنك إضافة رقم تجريبي.";
  } catch (error) {
    message.textContent = "المتصفح لا يسمح بالتخزين المحلي في هذه الصفحة.";
    form.querySelector("button").disabled = true;
    return;
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    const phone = form.elements.phone.value.trim();
    if (phone.replace(/[٠-٩۰-۹]/g, "0").replace(/\D/g, "").length < 6) {
      message.textContent = "أدخل رقمًا تجريبيًا لا يقل عن 6 أرقام.";
      return;
    }
    try {
      window.AmanStorage.addNumber({ phone });
      message.textContent = "تمت إضافة الرقم بنجاح. افتح واجهة الإدارة للتحقق من ظهوره.";
      form.reset();
    } catch (error) {
      message.textContent = error.message || "تعذرت إضافة الرقم.";
    }
  });
})();