(() => {
  "use strict";
  const KEY = "aman_connectivity_test_v2";
  function read() {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  }
  function normalizePhone(value) {
    return String(value || "").trim()
      .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[\s()-]/g, "");
  }
  const api = {
    key: KEY,
    getNumbers() {
      return read().filter(item => item && item.phone).map(item => ({
        id: item.id || String(item.createdAt || item.phone),
        phone: normalizePhone(item.phone),
        createdAt: item.createdAt || ""
      }));
    },
    addNumber(input) {
      const numbers = read();
      const phone = normalizePhone(input.phone);
      if (phone.replace(/\D/g, "").length < 6) {
        throw new Error("أدخل رقمًا تجريبيًا صحيحًا لا يقل عن 6 أرقام.");
      }
      if (numbers.some(item => normalizePhone(item.phone) === phone)) {
        throw new Error("هذا الرقم مضاف مسبقًا.");
      }
      const number = {
        id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
        phone,
        createdAt: new Date().toISOString()
      };
      numbers.unshift(number);
      window.localStorage.setItem(KEY, JSON.stringify(numbers));
      window.dispatchEvent(new CustomEvent("aman:numbers-changed"));
      return number;
    },
    clearNumbers() {
      window.localStorage.removeItem(KEY);
      window.dispatchEvent(new CustomEvent("aman:numbers-changed"));
    }
  };
  window.AmanStorage = Object.freeze(api);
})();