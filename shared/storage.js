(() => {
  "use strict";
  const KEY = "aman_connectivity_test_v2";
  function read() {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  }
  const api = {
    key: KEY,
    getCustomers() {
      return read();
    },
    addCustomer(input) {
      const customers = read();
      const phone = String(input.phone || "").trim();
      if (customers.some((item) => item.phone === phone)) {
        throw new Error("هذا الرقم التجريبي مسجل مسبقًا.");
      }
      const customer = {
        id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
        name: String(input.name || "").trim(),
        phone,
        createdAt: new Date().toISOString()
      };
      customers.unshift(customer);
      window.localStorage.setItem(KEY, JSON.stringify(customers));
      window.dispatchEvent(new CustomEvent("aman:customers-changed"));
      return customer;
    },
    clearCustomers() {
      window.localStorage.removeItem(KEY);
      window.dispatchEvent(new CustomEvent("aman:customers-changed"));
    }
  };
  window.AmanStorage = Object.freeze(api);
})();