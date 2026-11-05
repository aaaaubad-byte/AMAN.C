# تحليل الاعتماديات (AMAN.C @ 0c37d34)

> **تحديث 2026-11-05 (تحقق مؤكد، التفاصيل في `07` §4):** (1) المحاكاة: يستعملها `local-preview.mjs` واختبارات `task-rules/contract/browser*/isolation` فقط؛ `runtime.js` لا يستورد الملف ويرفض تسجيل أي محوّل `simulation:true` خارج localhost؛ الإنتاج يعمل بلا محاكاة. (2) `deploy.yml` ينسخ `index.html client admin styles services assets` فقط. (3) الأصول المستعملة: `logo-mark-v2.png`, `logo-mark-light-v2.png`, و`*-v3.png` (أيقونات، مختلفة بايتًا بين العميل والإدارة)؛ لا مرجع لأي SVG. (4) الواجهات لا تصل إلى `localStorage` (فقط `supabase-adapter.js` و`theme.js`). (5) `window.AMANClientData` المذكور في وثائق PHASE_2 **غير موجود** في main. (6) طرف fcd يضيف اختبارات متصفح إلى CI وينشر نسخة محاكاة (متجاوَز بقرار main اللاحق).

## ترتيب التحميل (صفحة العميل)
`theme.js` (في head؛ يحقن `visual-v6.css` + `aman-ui-v6.js`) ← `app.css` ← مكتبة supabase-js من CDN ← `supabase-config.js` ← `runtime.js` ← `supabase-adapter.js` ← `compact-filters.js` ← `pull-to-refresh.js` ← `app.js` ← `ui-v5.js` ← `pwa.js`.

## ترتيب التحميل (صفحة الإدارة)
نفسه، مع `login.css` و`app.js` ثم `phase3-a5-a8.js` ← `phase3-a9-a12.js` ← `phase3-a13-a17.js` ← `phase4-a18-a25.js` ← `phase5-a26-a31.js` ← `pwa.js`. ملفات المراحل تعتمد على ترتيب `defer` وعلى `window.AMANAdminNavigation` و`window.AMANAdminCurrentRequest` المعرَّفين في `admin/app.js`.

## المتغيرات العامة (واجهة التبعية بين الملفات)
`AMANServices`, `AMANClientServices`, `AMANAdminServices` (runtime) · `AMAN_SUPABASE_CONFIG` (config) · `AMANTheme` (theme) · `AMANClientNavigation` (client/app.js) · `AMANAdminNavigation`, `AMANAdminCurrentRequest` (admin/app.js) · `AMANPullToRefresh` · `window.supabase` (CDN).

## اعتماديات خارجية
- `@supabase/supabase-js@2.104.0` من jsdelivr بلا SRI (وغير موجودة في تخزين PWA).
- خط Tajawal/Alexandria: يُذكر في أنماط CSS (يلزم تحقق من مصدر التحميل الفعلي).
- لا package.json ولا تبعيات npm ولا خطوة بناء سوى `scripts/build-pwa.mjs`. Node 22 للفحص والاختبارات.

## اعتمادية الخدمة الخلفية
واجهات ← `AMAN*Services` (runtime) ← محوّل واحد مسجَّل: `supabase` (إنتاج) أو `simulation` (محلي فقط). المحوّل ← Supabase Auth + RPC (`public.client_*`/`public.admin_*`) ← دوال `aman.*` ← الجداول (RLS مغلق، الوصول عبر RPC).

## اعتماديات PWA
`sw.js` لكل تطبيق يخزّن مسبقًا ملفات التطبيق + `styles/app.css`, `runtime.js`, `supabase-config.js`, `supabase-adapter.js`, `theme.js`. **غير مشمولة:** `visual-v6.css`, `aman-ui-v6.js`, `compact-filters.js`, `pull-to-refresh.js`, الشعارات `assets/brand/*`, مكتبة supabase-js → تُجلب من الشبكة فقط (نقص دون اتصال).

## اعتماديات البناء والنشر
`deploy.yml`: اختبارات (`tests/*.test.js` + `*.test.mjs`) + `validate.mjs` ← نسخ إلى `dist/` ← `build-pwa.mjs dist <sha>` ← رفع Pages. يعتمد على أن الجذر هو جذر المستودع (سيتغير إن نُقل التطبيق إلى مجلد فرعي).

## اعتماديات الاختبارات
- `task-rules`, `contract`: يحمّلان `simulation/simulation-adapter.js`.
- `supabase-adapter.test`: عميل Supabase وهمي داخل `vm`.
- `browser*.test`: Playwright + `scripts/local-preview.mjs` (محاكاة).
- `isolation.test`: يفحص خلو صفحات الإنتاج من المحاكاة، وملفات معينة من الأسرار، ونص `deploy.yml`.
