/* AMAN.D — واجهة تكامل عمليات الطلبات. التفاصيل والمراجعة داخل نواة الإدارة. */
(() => {
"use strict";
const navigation = () => window.AMANAdminNavigation || null;
const refresh = () => {
  const api=navigation();
  if (!api || typeof api.refresh!=="function") return Promise.resolve(false);
  return Promise.resolve(api.refresh()).then(()=>true).catch(()=>false);
};
window.AMANAdminRequests = Object.freeze({ refresh });
if (window.AMANPullToRefresh) window.AMANPullToRefresh.register("requests", refresh);
})();