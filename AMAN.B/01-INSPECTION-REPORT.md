# تقرير فحص المستودع AMAN.C (المرحلة 1)

> **تحديث 2026-11-05:** استُكمل الفحص بقراءة الوثائق التاريخية الخمس عشرة وخريطة الشاشات (وقورنت بالكود)، ومراجعة الفرعين `feature/aman-c-complete-development` و`feature/aman-c-ui-redesign`، وتتبع المحاكاة وترتيب التحميل والأصول والنشر. التفاصيل ومصادر كل استنتاج في `07-HISTORICAL-DOCS-AND-BRANCH-REVIEW.md`؛ التعارضات الجديدة C-16…C-29 في `03`. أهم الخلاصات: لا وظيفة فريدة في الفرعين تُنقل؛ D13 أُلغي بالواقع؛ المحاكاة ليست جزءًا من منطق الإنتاج لكنها المرجع المُختبَر الوحيد لقواعد المهام (فجوة C-17)؛ الأيقونات المستعملة v3 فقط والشعار v2 PNG فقط. القسم 1 أدناه (نتائج التشغيل) لم يُعَد تشغيله في هذه الجولة.

- المستودع: `aaaaubad-byte/AMAN.C` — الفرع `main` — HEAD عند الفحص: `0c37d34` (2026-11-05 02:23 بتوقيت عدن) «style: add subtle visual depth to AMAN.C».
- طريقة الفحص: استنساخ سطحي + جلب 300 التزام من `main`؛ قائمة الفروع عبر `git ls-remote`؛ قراءة ملفات المستودع؛ قراءة (قراءة فقط) لقاعدة Supabase `hzurzkjtjvkfxmwzskks` عبر الكتالوج؛ تشغيل الفحوص غير المتصفحية.
- الملفات المتتبَّعة: 105 ملفًا (34 منها أيقونات وشعارات). لا توجد ملفات مخفية غير `.github/`.

## 1. ما نُفِّذ فعليًا (نتائج حقيقية)

| الفحص | النتيجة |
|---|---|
| `node scripts/validate.mjs` | نجح |
| `tests/isolation.test.js` | 8/8 |
| `tests/task-rules.test.mjs` | 28/28 |
| `tests/contract.test.mjs` | 23/23 |
| `tests/pwa.test.mjs` | 11/11 |
| `tests/supabase-adapter.test.mjs` | 18/18 |
| `tests/theme.test.mjs` | 3/3 |
| اختبارات المتصفح (`browser.test.js`, `browser-admin.test.js`) | **لم تُشغَّل** (تحتاج Playwright وخادم معاينة المحاكاة) |
| حالة GitHub Actions / نشر Pages | **غير مؤكدة** (لا وصول إلى API) |

## 2. خريطة الملفات والوظائف

### الجذر
- `index.html` — بوابة تربط `./client/` و`./admin/`؛ يحمّل `services/theme.js` و`styles/app.css`. فيه نص «نسخة البناء الحالية تتضمن هيكل الواجهات فقط…» (نص قديم).
- `README.md` — وصف قديم جزئيًا (انظر التعارضات).
- `AMAN_C_SCREEN_MAP_BASELINE.md` (57KB) — خريطة شاشات مرجعية تاريخية.

### العميل `client/`
- `index.html` (31KB) — الشاشات: boot، home، login، signup، numbers، operations، operation-detail، protection، review، result، notifications، number-alerts، report، account، aman-service (+ `screen-contract`).
- `app.js` (44KB، ~74 دالة) — منطق جميع الشاشات؛ يستخدم 15 من 15 عقد خدمة عميل.
- `ui-v5.js` (0.8KB) — شريط تبويب تصفية الإشعارات.
- `pwa.js`، `sw.js`، `manifest.webmanifest` — PWA مستقل (النطاق `/AMAN.C/client/`).
- `icons/` — 15 ملفًا، المستعمل فعليًا منها 4 (نسخة v3 فقط).

### الإدارة `admin/`
- `index.html` (17KB) — شاشة دخول، لوحة رئيسية، شريط سفلي (الرئيسية، الطلبات، الأرقام، العملاء، المزيد)، حاوية عامة للأقسام.
- `app.js` (29KB) — التنقل، حارس المصادقة، لوحة المؤشرات، الطلبات (قائمة وتفاصيل)، تعريفات 16 قسمًا، «المزيد». فيه مسار اعتماد/رفض مكرر **ميت** (`showApprovePreview/showRejectForm/performDecision`، 7 مواضع) قرّر المالك حذفه بعد نجاح الاختبارات ولم يُحذف.
- `phase3-a5-a8.js` — نافذتا الاعتماد والرفض + قائمة الأرقام وتفاصيلها.
- `phase3-a9-a12.js` — العملاء وتغيير الحالة.
- `phase3-a13-a17.js` — مهام السداد، شاشة «نافذة الظهور والمتابعة»، التنفيذ وإعادة الجدولة، تقرير الإيرادات.
- `phase4-a18-a25.js` — البلاغات، الشركات والإعدادات، الإشعارات، تنبيهات الأرقام.
- `phase5-a26-a31.js` — الباقات، وسائل الدفع، المحتوى الثابت، سجل التدقيق، الحساب.
- `login.css`، `pwa.js`، `sw.js`، `manifest.webmanifest`، `icons/` (15 ملفًا، 4 مستعمل).
- الأقسام المعرّفة (16): requests، numbers، customers، tasks، complaints، reports، settings، notifications، alerts، packages، payments، content، audit، followup، more، account.

### الخدمات المشتركة `services/`
- `runtime.js` — واجهة العقود الموحدة (`AMANServices`, `AMANClientServices` 15 عملية، `AMANAdminServices` 37 عملية)، التطبيع، عدم اصطناع النجاح، تنسيق التواريخ بتوقيت `Asia/Aden`، شارة «الخدمة غير مهيأة».
- `supabase-config.js` — عنوان المشروع ومفتاح النشر العام (`sb_publishable_…`) فقط.
- `supabase-adapter.js` — ينفذ كل العقود فوق Supabase Auth ودوال RPC (`rpc(fn,{p})`)، عميلان بمفتاحَي تخزين مختلفين، مهلة 20 ثانية، بلا إعادة محاولة للعمليات المغيِّرة. يتخطى التسجيل إن وُجد علم المحاكاة.
- `theme.js` — تفضيل السمة (نظام/فاتح/داكن) في `localStorage`، **ويحقن** `styles/visual-v6.css` و`services/aman-ui-v6.js` ديناميكيًا.
- `aman-ui-v6.js` — يستبدل كل أيقونات SVG بمجموعة موحدة عبر مطابقة توقيعات الأيقونات القديمة، ويحوّل مؤشرات الإدارة إلى شريط أفقي، ويضيف شريط البطاقات الفارغ للرئيسية.
- `compact-filters.js`، `pull-to-refresh.js` — سلوك عرضي (مرشحات مدمجة، سحب للتحديث).
- `CONTRACTS.md` — عقود الخدمات وقواعد المصادرة والمهام (الوثيقة المعتمدة للسلوك).

### الأنماط `styles/`
- `app.css` (70KB) و`visual-v6.css` (14KB). `admin/login.css` لدخول الإدارة. النظام اللوني بالرموز المركزية.

### المحاكاة `simulation/`
- `simulation-adapter.js` (60KB) — محوّل بيانات وهمي على `localStorage` يعمل على localhost فقط عبر `scripts/local-preview.mjs`؛ `README.md`.

### قاعدة البيانات `supabase/`
- ترحيل واحد: `migrations/20261101000100_initial_schema.sql` (15KB) — **لا يطابق القاعدة الفعلية** (انظر القسم 4).

### السكربتات والنشر والاختبارات
- `scripts/validate.mjs`، `build-pwa.mjs` (ختم `__BUILD_ID__` في `sw.js`)، `local-preview.mjs` (خادم 127.0.0.1 مع حقن المحاكاة)، `color-audit/*.py` (أدوات تدقيق CSS تاريخية).
- `.github/workflows/deploy.yml` — اختبارات ثم نشر `main` إلى Pages (ينسخ `index.html client admin styles services assets` فقط، بلا `simulation`)؛ `validate-product.yml` — **قديم** (فروع قديمة، لا يشغّل `.mjs`).
- `tests/` — 9 ملفات: 6 بلا متصفح (91 اختبارًا شُغّلت ونجحت كلها أعلاه)، و3 ملفات إضافية تعتمد على المتصفح/المحاكاة لم تُشغَّل.
- `docs/` — 22 وثيقة تاريخية (توجيهات استئناف، سجلات تقدم، حالات واجهة) + `design/README.md`.

## 3. التطابق بين الواجهات والعقود
- عمليات العميل 15/15 مستعملة في الواجهة، وعمليات الإدارة 37/37.
- محوّل المحاكاة ومحوّل Supabase ينفذان العقود كلها (لا ناقص).

## 4. قاعدة Supabase الفعلية (قراءة فقط)
- 6 ترحيلات مطبقة: `initial_schema`، `operational_schema_and_helpers`، `client_rpcs`، `admin_rpcs_part1`، `admin_rpcs_part2`، `revoke_public_execution_rls_auto_enable` (إصدارات 20261103…). **ترحيل واحد فقط مشابه موجود في المستودع وبإصدار مختلف.**
- 22 جدولًا في `public` (منها `notification_broadcasts` و`profile_status_history` غير الموجودين في ترحيل المستودع) مع RLS على كلها؛ سياسة واحدة: `profiles_select_self`.
- أعمدة إضافية غير موجودة في ترحيل المستودع: `numbers.owner_id`، `numbers.plan_anchor_at`، `company_task_settings.task_due_window_days`، `operation_requests.number_status_at_submit`، `payment_methods.account_number`، `audit_log.reason`.
- فهارس إضافية: `tasks_one_pending_per_number`، `numbers_owner_idx`، `reports_number_idx`.
- مخطط `aman` (≈40 دالة مساعدة) ودوال RPC: 11 `client_*` + 35 `admin_*` كلها `SECURITY DEFINER`؛ لا `USAGE` على `aman` لـ anon/authenticated.
- امتدادات: btree_gist، pgcrypto، uuid-ossp، pg_stat_statements، supabase_vault.
- **بيانات حية موجودة** (profiles 4، companies 1، numbers 2، operation_requests 2، tasks 1، notifications 1، audit_log 4 …). ملفات الترحيل في AMAN.D يجب ألا تحمل بيانات تشغيلية.
- لم يُنفَّذ أي تعديل على القاعدة.

## 5. مستودعات وفروع ذات صلة
- 41 فرعًا في AMAN.C (معظمها فروع أعمال تصميم وواجهة مدموجة أو قديمة).
- مستودع آخر `aaaaubad-byte/AMAN.C-1` (آخر دفع 2026-11-05 01:36) — **خارج النطاق ولم يُفحص**، وفق قاعدة «العمل على AMAN.C لا على نسخة بديلة».
- الفحص لتاريخ التعديلات اقتصر على سجل `main` (آخر 300 التزام) وسجلات الوثائق؛ لم تُقارَن الفروع غير المدموجة تفصيليًا.
