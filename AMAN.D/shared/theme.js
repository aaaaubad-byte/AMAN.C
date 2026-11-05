/* AMAN — تفضيل سمة العرض: «حسب الجهاز» افتراضيًا، وفاتح/داكن اختياران صريحان. */
(() => {
  "use strict";
  const KEY = "aman-display-theme-v1";
  const VALID = new Set(["system", "light", "dark"]);
  const THEME_COLOR = { dark: "#182b35", light: "#f4f8fa" };
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function preference() {
    try {
      const stored = localStorage.getItem(KEY);
      return VALID.has(stored) ? stored : "system";
    } catch {
      return "system";
    }
  }

  /* يطبّق السمة المحسومة على الجذر ولون شريط المتصفح وعناصر الإعداد وشعار الوضع الداكن. */
  function apply() {
    const pref = preference();
    const resolved = pref === "system" ? (media && media.matches ? "dark" : "light") : pref;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = pref;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLOR[resolved];
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
      /* تبقى السمة المختارة فعّالة في هذه الصفحة حتى لو تعذّر التخزين. */
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

/* محمّل الطبقة البصرية: ورقة الأنماط visual.css وسلوك الأيقونات والشرائح (ui-icons.js).
   يعمل theme.js داخل <head> قبل تحليل base.css، فتُلحَق الطبقة عند اكتمال الرأس
   (لحظة إنشاء <body> وقبل أول رسم لمحتواه) لضمان أنها تلي base.css في ترتيب التتالي. */
(() => {
  "use strict";
  const current = document.currentScript;
  if (!current || !current.src || document.querySelector("link[data-visual-layer]")) return;
  const cssUrl = new URL("../styles/visual.css", current.src).href;
  const jsUrl = new URL("./ui-icons.js", current.src).href;
  let done = false;

  function attach() {
    if (done || !document.head) return;
    done = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.setAttribute("data-visual-layer", "");
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
