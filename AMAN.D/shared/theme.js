/*
 * AMAN — تفضيل سمة العرض وحقن الطبقة البصرية.
 *
 * الجزء الأول: «حسب الجهاز» هو الافتراضي، والفاتح/الداكن اختيار صريح يتجاوزه ويُحفظ في localStorage.
 *   - يضبط data-theme وdata-theme-preference على عنصر الجذر.
 *   - يضبط لون المتصفح (meta theme-color) وقيمة عناصر [data-theme-setting] ومصدر الشعار الداكن.
 *   - يتابع تغيّر تفضيل النظام (عند اختيار «حسب الجهاز» فقط) وتغيّر المخزن من تبويب آخر.
 * الجزء الثاني: يربط styles/visual.css وshared/ui-icons.js بعد اكتمال <head>، ليأتي ترتيب الطبقة
 *   البصرية بعد styles/base.css مهما كان موضع تحميل هذا الملف (يُحمَّل في <head> قبل تحليل base.css).
 *
 * لا اعتماد على ملفات أخرى وقت التشغيل سوى المسارين النسبيين أعلاه.
 */
(() => {
  "use strict";
  const KEY = "aman-display-theme-v1";
  const VALID = new Set(["system", "light", "dark"]);
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function preference() {
    try {
      const stored = localStorage.getItem(KEY);
      return VALID.has(stored) ? stored : "system";
    } catch {
      return "system";
    }
  }

  function apply() {
    const pref = preference();
    const resolved = pref === "system" ? (media && media.matches ? "dark" : "light") : pref;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = pref;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolved === "dark" ? "#182b35" : "#f4f8fa";
    document.querySelectorAll("[data-theme-setting]").forEach(control => {
      control.value = pref;
    });
    document.querySelectorAll("picture source[data-theme-dark-logo]").forEach(source => {
      source.media = resolved === "dark" ? "all" : "not all";
    });
  }

  window.AMANTheme = Object.freeze({ getPreference: preference, apply });
  apply();

  document.addEventListener("change", event => {
    const control = event.target && event.target.closest && event.target.closest("[data-theme-setting]");
    if (!control || !VALID.has(control.value)) return;
    try {
      localStorage.setItem(KEY, control.value);
    } catch {
      /* يبقى الاختيار فعّالًا في هذه الصفحة حتى لو تعذّر التخزين. */
    }
    apply();
  });

  if (media) {
    const onSystemChange = () => { if (preference() === "system") apply(); };
    if (media.addEventListener) media.addEventListener("change", onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }
  window.addEventListener("storage", event => {
    if (event.key === KEY) apply();
  });
  document.addEventListener("DOMContentLoaded", apply);
})();

/* ---------- حقن الطبقة البصرية: ورقة الأنماط + سلوك الأيقونات والبطاقات ---------- */
(() => {
  "use strict";
  const current = document.currentScript;
  if (!current || !current.src || document.querySelector("link[data-aman-visual-v6]")) return;
  const cssUrl = new URL("../styles/visual.css", current.src).href;
  const jsUrl = new URL("./ui-icons.js", current.src).href;
  let done = false;

  function attach() {
    if (done || !document.head) return;
    done = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.setAttribute("data-aman-visual-v6", "");
    document.head.append(link);
    const script = document.createElement("script");
    script.src = jsUrl;
    script.async = false;
    document.head.append(script);
  }

  if (document.body) {
    attach();
  } else {
    const watcher = new MutationObserver(() => {
      if (document.body) { watcher.disconnect(); attach(); }
    });
    watcher.observe(document.documentElement, { childList: true });
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  }
})();
