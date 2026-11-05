# شجرة ملفات AMAN.D — مقترحة (بانتظار الاعتماد)

الحالة: **مقترحة، غير معتمدة** — مراجَعة بعد اكتمال قراءة الوثائق التاريخية والفرعين (2026-11-05). لا يُكتب أي ملف في `AMAN.D` قبل اعتمادها.

## التعديلات عن النسخة السابقة (للمراجعة)
- **R1** الأيقونات: المستعمل فعليًا هو مجموعة `*-v3.png` (manifest وHTML وprecache)؛ تُنسخ بايتًا ببايت بأسماء بلا إصدار، ولكل تطبيق مجموعته (مختلفة بايتًا). لا SVG ولا v1/v2.
- **R2** الشعار: `logo-mark-v2.png` و`logo-mark-light-v2.png` هما المستعملان (5 مراجع لكل)؛ يُنسخان باسمي `logo-mark.png` و`logo-mark-light.png`. ملفات SVG غير مستعملة.
- **R3** ملفات الإدارة تبقى مقسمة بالنطاق (لم تتغير)، وتُحدَّد الأولوية بترتيب تحميل صريح موثق؛ **مسار الاعتماد/الرفض الميت يُحذف** ويملك `requests.js` النقرات مباشرة (لا التقاط يخفي كودًا آخر).
- **R4** اختبار جديد `tests/client-auth-gate.test.js` يعتمد **سلوك** اختبارَي fcd (بلا جلسة → شاشة الدخول؛ دخول↔إنشاء حساب) بلا محاكاة.
- **R5** `docs/DEVELOPMENT.md` يضم التشغيل المحلي بلا محاكاة (بدل `LOCAL_PREVIEW.md`) بعد اختباره فعليًا.
- **R6** `scripts/serve.mjs`: خادم ثابت يخدم المجلدات المنشورة فقط (بلا حقن علم ولا مجلد محاكاة).
- **R7** `deploy/pages.yml` يضم خطوة اختبارات المتصفح (فكرة fcd) بشرط قرار Q3؛ لا نسخة محاكاة منشورة.
- **R8** precache كامل لكل ملفات الواجهة الفعلية (إغلاق C-05).
- **R9** بلا `shared/...` للمحاكاة ولا أي مرجع لها؛ اختبارات القواعد تنتظر Q3 ولا تُفترض.

## الشجرة

```
AMAN.D/
├─ README.md · package.json · .gitignore · index.html
├─ client/  index.html · app.js · pwa.js · sw.js · manifest.webmanifest · icons/ (4 PNG)
├─ admin/   index.html · app.js · requests.js · numbers.js · customers.js · tasks.js
│           complaints.js · companies.js · messaging.js · reports.js · catalog.js
│           content-audit.js · account.js · pwa.js · sw.js · manifest.webmanifest · icons/ (4 PNG)
├─ shared/  config.js · runtime.js · supabase-adapter.js · theme.js · ui-icons.js
│           compact-filters.js · pull-to-refresh.js
├─ styles/  base.css · visual.css · admin-login.css
├─ assets/brand/ logo-mark.png · logo-mark-light.png
├─ supabase/migrations/ 0001_schema … 0006_reference_data (.sql) · tests/security_and_rules.sql
├─ scripts/ validate.mjs · build.mjs · serve.mjs
├─ tests/   adapter.test.mjs · pwa.test.mjs · theme.test.mjs · independence.test.mjs
│           client-auth-gate.test.js · (اختبارات القواعد/المتصفح حسب Q3) · helpers.mjs
├─ deploy/pages.yml  (قالب غير مفعّل)
└─ docs/    ARCHITECTURE · SPEC-CLIENT · SPEC-ADMIN · BUSINESS-RULES · SERVICES-CONTRACT
            DATABASE · SECURITY · OPERATIONS · DEVELOPMENT (.md)
```

## تفصيل كل ملف: الوظيفة والمصادر والاعتماديات

مسارات «المصدر» نسبة إلى AMAN.C على `main` (`0c37d34`)، وهي مراجع لاستخلاص المعلومات فقط؛ كل ملف يُكتب من الصفر بعد دورة الخطوات الست. «يعتمد على» = اعتماديات داخل AMAN.D.

### الجذر
| الملف | الوظيفة | المصادر | يعتمد على |
|---|---|---|---|
| `README.md` | مدخل: وصف، تشغيل، بناء، نشر، روابط الوثائق | الواقع النهائي (ليس `README.md` القديم) | `docs/*` |
| `package.json` | سكربتات `validate/test/build/serve` فقط، `engines: node>=22`، بلا dependencies | `scripts/*`، `deploy.yml` (أوامر الاختبار) | `scripts/*` |
| `.gitignore` | `dist/`، ملفات البيئة، `node_modules` | — | — |
| `index.html` | بوابة تربط `client/` و`admin/` بأيقونات SVG الموحدة وبلا نص «هيكل فقط» | `index.html` (C-26) | `shared/theme.js`، `styles/*`، `assets/brand/*` |

### العميل `client/`
| الملف | الوظيفة | المصادر | يعتمد على |
|---|---|---|---|
| `index.html` | شاشات C-01…C-12 + الدخول وإنشاء الحساب + الشريط السفلي والعلوي | `client/index.html`، خريطة الشاشات §4–8 | `shared/*`، `styles/*`، `assets/brand/*`، `pwa.js` |
| `app.js` | منطق العميل: التنقل مع حفظ السياق، حارس الجلسة، قوائم الحالات الخمس، الحماية والمراجعة والنتيجة، الحساب والإشعارات والتنبيهات والبلاغ؛ يضم تبويب تصفية الإشعارات من `ui-v5.js` | `client/app.js`، `client/ui-v5.js`، `CONTRACTS.md`، الخريطة C-01…C-12 | `shared/runtime.js` (`AMANClientServices`)، `shared/ui-icons.js` |
| `pwa.js` / `sw.js` / `manifest.webmanifest` | تسجيل SW وإشعار التحديث؛ precache كامل (R8) بعلامة `__BUILD_ID__`؛ manifest (`start_url ./`، ألوان `#f1f5f6`) | نفس الأسماء في `client/`، `tests/pwa.test.mjs` | `scripts/build.mjs` (ختم الإصدار) |
| `icons/` (4 PNG) | `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon` | `client/icons/*-v3.png` (نسخ ثنائي، R1) | manifest، HTML |

### الإدارة `admin/`
| الملف | الوظيفة | المصادر | يعتمد على |
|---|---|---|---|
| `index.html` | هيكل A-01…A-31 وتحميل الوحدات بترتيب صريح | `admin/index.html` | `shared/*`، `styles/*` |
| `app.js` | النواة: التنقل D1 والمزيد، حارس المصادقة، لوحة A-02، تعريف الأقسام (`definitions` بأيقونات SVG)، حدث تغيّر الشاشة | `admin/app.js` (بدون المسار الميت C-08) | `shared/runtime.js` (`AMANAdminServices`)، `shared/ui-icons.js` |
| `requests.js` | A-03/A-04/A-05/A-06: الطلبات وتفاصيلها ونافذتا الاعتماد والرفض (تملك النقرات مباشرة) | `phase3-a5-a8.js` (جزء الطلبات)، `app.js`، `PHASE_3_A1_A4`/`A5_A8` | `app.js` |
| `numbers.js` | A-07/A-08: الأرقام وتفاصيلها (قراءة فقط) | `phase3-a5-a8.js` (جزء الأرقام) | `app.js` |
| `customers.js` | A-09/A-10/A-11: العملاء وتغيير الحالة (تؤكَّد `append` مرة واحدة، C-24) | `phase3-a9-a12.js` | `app.js` |
| `tasks.js` | A-12…A-15 + «نافذة الظهور والمتابعة» (بلا رقم، C-25): تنفيذ وإعادة جدولة بالمعاينة | `phase3-a13-a17.js` (المهام والمتابعة)، `DECISIONS.md` | `app.js` |
| `reports.js` | A-16 تقرير الإيرادات | `phase3-a13-a17.js` (الإيرادات) | `app.js` |
| `complaints.js` | A-17/A-18 البلاغات (مالك `complaints` الوحيد) | `phase4-a18-a25.js`، CD5 §3.3 | `app.js` |
| `messaging.js` | A-19…A-22 الإشعارات والتنبيهات اليدوية | `phase4-a18-a25.js` | `app.js` |
| `companies.js` | A-23…A-25 الشركات والبادئات وإعدادات المهام والتنشيط لكل شركة | `phase4-a18-a25.js`، الخريطة A-23…A-25 | `app.js` |
| `catalog.js` | A-26/A-27 الباقات ووسائل الدفع (حقول D9) | `phase5-a26-a31.js` | `app.js` |
| `content-audit.js` | A-28/A-29 المحتوى وسجل التدقيق | `phase5-a26-a31.js` | `app.js` |
| `account.js` | A-30/A-31 الحساب والخروج | `phase5-a26-a31.js` | `app.js` |
| `pwa.js` / `sw.js` / `manifest.webmanifest` / `icons/` | كما في العميل بهوية الإدارة (مجموعة أيقونات الإدارة، «إدارة أمان») | `admin/pwa.js` … `admin/icons/*-v3.png` | `scripts/build.mjs` |

> التقسيم الفرعي مشروط بتحقق كل ملف من ثبات الوظيفة (المرحلة 4، الخطوة 2): إن ظهر أن ملفين متلازمان لا يفصلان يُدمجان ويُسجَّل ذلك.

### المشترك `shared/`
| الملف | الوظيفة | المصادر | يعتمد على |
|---|---|---|---|
| `config.js` | عنوان Supabase ومفتاح النشر العام فقط (لا أسرار) | `services/supabase-config.js` | — |
| `runtime.js` | عقود الخدمات `AMANClientServices/AMANAdminServices`، التسجيل، التطبيع، التواريخ (Asia/Aden)، رموز الأخطاء، بانر «الخدمة غير مهيأة»؛ **بلا مسار تسجيل محاكاة** | `services/runtime.js`، `CONTRACTS.md`، `contract.test.mjs` | `supabase-adapter.js` (يسجَّل فيه) |
| `supabase-adapter.js` | تنفيذ العقود فوق Auth وRPC: جلسة العميل (localStorage) والمدير (sessionStorage / «تذكرني») | `services/supabase-adapter.js`، `supabase-adapter.test.mjs`، كتالوج RPC الحي | `config.js`، `runtime.js`، مكتبة `supabase-js` (CDN، Q4) |
| `theme.js` | تفضيل السمة (فاتح/داكن) وحقن الطبقة البصرية | `services/theme.js`، `theme.test.mjs` | `styles/visual.css` |
| `ui-icons.js` | الأيقونات الموحدة SVG وشريط مؤشرات الإدارة | `services/aman-ui-v6.js` | — |
| `compact-filters.js` | أشرطة البحث والفلترة المدمجة | `services/compact-filters.js` | `ui-icons.js` |
| `pull-to-refresh.js` | السحب للتحديث | `services/pull-to-refresh.js` | — |

### الأنماط والأصول
| الملف | الوظيفة | المصادر | يعتمد على |
|---|---|---|---|
| `styles/base.css` | رموز الألوان المركزية (فاتح/داكن) والمكونات والتخطيط؛ بعد تحليل الـ cascade (C-06)، بقايا الألوان الحرفية إلى رموز (C-07)، الخط (C-21) | `styles/app.css`، `COLOR_SYSTEM_PROGRESS` | — |
| `styles/visual.css` | طبقة المظهر تُربط مباشرة بعد base | `styles/visual-v6.css` | `base.css` |
| `styles/admin-login.css` | شاشة دخول الإدارة | `admin/login.css` | `base.css` |
| `assets/brand/logo-mark(.png|-light.png)` | الشعار (نسخ ثنائي، R2) | `logo-mark-v2.png`, `logo-mark-light-v2.png` | HTML |

### قاعدة البيانات `supabase/`
| الملف | الوظيفة | المصادر | يعتمد على |
|---|---|---|---|
| `migrations/0001_schema.sql` | الأنواع والجداول والقيود والفهارس والمشغّل | **كتالوج Supabase الحي (قراءة فقط، Q2)** + مقارنة بـ `20261101000100_initial_schema.sql` | — |
| `0002_helpers.sql` | مخطط `aman` والدوال المساعدة (`adm()`, `cust()` …) | الكتالوج الحي | 0001 |
| `0003_client_rpcs.sql` | 11 دالة `client_*` | الكتالوج + نصوص الدوال (C-17) | 0001–0002 |
| `0004_admin_rpcs.sql` | 35 دالة `admin_*` | نفسه | 0001–0002 |
| `0005_security.sql` | RLS والصلاحيات والإلغاءات (EXECUTE لـ `authenticated` فقط) | الكتالوج، `SUPABASE_INTEGRATION_PROGRESS` §3 | 0001–0004 |
| `0006_reference_data.sql` | أسباب الرفض (3) ومفاتيح المحتوى (4) فقط، بلا بيانات تشغيلية (C-13) | القاعدة الحية | 0001 |
| `tests/security_and_rules.sql` | اختبارات بمعاملة تُلغى؛ **لا تُشغَّل إلا بموافقة وعلى بيئة حسب Q3** | أمثلة `task-rules.test.mjs` (القيم فقط) | 0001–0006 |

### السكربتات والاختبارات والنشر
| الملف | الوظيفة | المصادر | يعتمد على |
|---|---|---|---|
| `scripts/validate.mjs` | وجود الملفات، صياغة JS، مسارات المراجع، **الاستقلال** (لا ذكر لـ AMAN.B/AMAN.C ولا للمحاكاة ولا أسرار)، تغطية precache | `scripts/validate.mjs` | كل الملفات |
| `scripts/build.mjs` | تجميع `dist/` (الملفات المنشورة فقط) وختم `__BUILD_ID__` في عاملي PWA | `scripts/build-pwa.mjs` + خطوات النسخ في `deploy.yml` | `*/sw.js` |
| `scripts/serve.mjs` | خادم ثابت محلي للمجلدات المنشورة فقط (R6) | `scripts/local-preview.mjs` (بدون الحقن والمحاكاة) | — |
| `tests/adapter.test.mjs` | المحوّل مقابل عميل Supabase اختباري داخل `vm` | `supabase-adapter.test.mjs` | `shared/*` |
| `tests/pwa.test.mjs`, `theme.test.mjs` | ختم الإصدار وprecache؛ السمة | نفس الأسماء | `build.mjs`، `theme.js` |
| `tests/independence.test.mjs` | لا مراجع إلى AMAN.B/AMAN.C، لا محاكاة، لا أسرار، مسارات صحيحة، لا `localStorage` في الواجهات | `isolation.test.js` | كل الملفات |
| `tests/client-auth-gate.test.js` | بلا جلسة → شاشة الدخول، دخول↔إنشاء حساب، RTL (R4) | `tests/browser-client.test.js` على fcd (سلوكه) + `browser-helpers.mjs` | Playwright (اختياري) |
| `tests/helpers.mjs` | مساعدات الاختبارات | `tests/browser-helpers.mjs` | — |
| اختبارات القواعد/المتصفح | حسب Q3 (لا تُفترض) | `task-rules`، `contract`، `browser*.test.js` (قيم وأمثلة فقط) | — |
| `deploy/pages.yml` | قالب GitHub Actions: اختبارات ← validate ← build ← Pages. **غير مفعّل** (C-14، C-10) | `deploy.yml` | `scripts/*` |

### الوثائق النهائية `docs/` (تُكتب من الواقع وتُطابق الكود والقاعدة 100%)
`ARCHITECTURE.md` (البنية وترتيب التحميل) · `SPEC-CLIENT.md` (C-01…C-12 والحالات الخمس) · `SPEC-ADMIN.md` (A-01…A-31) · `BUSINESS-RULES.md` (المصادقة، الأهلية، المهام، المصادرة، التنشيط، رموز الأخطاء) · `SERVICES-CONTRACT.md` · `DATABASE.md` · `SECURITY.md` · `OPERATIONS.md` (إعداد Supabase، البناء، النشر) · `DEVELOPMENT.md` (التطوير، الاختبار، التشغيل المحلي بلا محاكاة).

## ما لا يُنقل عمدًا (مع السبب)
`simulation/` (محاكاة)، `scripts/local-preview.mjs` (يحقن المحاكاة)، `scripts/color-audit/*`، كل `docs/` التاريخية و`AMAN_C_SCREEN_MAP_BASELINE.md`، `.github/workflows/validate-product.yml`، `README.md` القديم، `services/CONTRACTS.md` بنصه القديم، أيقونات v1/v2 وكل `*.svg` غير المستعملة، `supabase/migrations/20261101000100_initial_schema.sql` (لا يطابق القاعدة)، `LOCAL_PREVIEW.md` و`ui-redesign` و`brand.css` من الفرعين.

## الاعتماديات بين المجموعات
`*/index.html` → `shared/*` + `styles/*` + `assets/brand/*` + ملفات التطبيق + `pwa.js` · `admin/*.js` → `admin/app.js` → `shared/runtime.js` → `shared/supabase-adapter.js` → `shared/config.js` · `*/sw.js` → قائمة precache تغطي كل ملف واجهة فعلي · `scripts/build.mjs` → `*/sw.js` · `tests/*` → الملفات المنشورة فقط · `docs/*` ← مطابقة لكل ما سبق.
