# شجرة ملفات AMAN.D — مقترحة (بانتظار الاعتماد)

الحالة: **مقترحة، غير معتمدة**. لا يُكتب أي ملف في AMAN.D قبل اعتمادها. التقسيم الفرعي لوحدات الإدارة مشروط بتحقق كل ملف من ثبات الوظيفة (المرحلة 4، الخطوة 2).

```
AMAN.D/
├─ README.md                      مدخل: وصف، تشغيل، بناء، نشر (مرجع للوثائق)
├─ package.json                   سكربتات فقط (validate/test/build/serve)، engines: node>=22، بلا dependencies
├─ .gitignore                     dist/ وملفات البيئة
├─ index.html                     بوابة تربط client/ و admin/
├─ client/
│  ├─ index.html                  شاشات العميل
│  ├─ app.js                      منطق العميل (يتضمن تبويب تصفية الإشعارات المدمج من ui-v5)
│  ├─ pwa.js                      تسجيل SW وإشعار التحديث
│  ├─ sw.js                       Service Worker (علامة __BUILD_ID__)
│  ├─ manifest.webmanifest
│  └─ icons/ icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
├─ admin/
│  ├─ index.html
│  ├─ app.js                      النواة: التنقل، حارس المصادقة، اللوحة، تعريف الأقسام، المزيد
│  ├─ requests.js                 قائمة الطلبات وتفاصيلها ونافذتا الاعتماد والرفض
│  ├─ numbers.js                  الأرقام وتفاصيلها
│  ├─ customers.js                العملاء وتغيير الحالة
│  ├─ tasks.js                    مهام السداد، نافذة الظهور والمتابعة، التنفيذ وإعادة الجدولة
│  ├─ complaints.js               البلاغات
│  ├─ companies.js                الشركات وإعدادات المهام والتنشيط
│  ├─ messaging.js                الإشعارات وتنبيهات الأرقام
│  ├─ reports.js                  تقرير الإيرادات
│  ├─ catalog.js                  الباقات ووسائل الدفع
│  ├─ content-audit.js            المحتوى الثابت وسجل التدقيق
│  ├─ account.js                  الحساب الإداري
│  ├─ pwa.js · sw.js · manifest.webmanifest
│  └─ icons/ (نفس مجموعة العميل لكن بهوية الإدارة)
├─ shared/
│  ├─ config.js                   عنوان Supabase ومفتاح النشر العام فقط
│  ├─ runtime.js                  عقود الخدمات والتطبيع وتنسيق التواريخ
│  ├─ supabase-adapter.js         تنفيذ العقود فوق Auth وRPC
│  ├─ theme.js                    تفضيل السمة
│  ├─ ui-icons.js                 مجموعة الأيقونات الموحدة وشريط مؤشرات الإدارة (من aman-ui-v6)
│  ├─ compact-filters.js
│  └─ pull-to-refresh.js
├─ styles/
│  ├─ base.css                    من app.css بعد التحليل
│  ├─ visual.css                  طبقة المظهر (من visual-v6) تُربط مباشرة بعد base
│  └─ admin-login.css
├─ assets/brand/ logo-mark.png, logo-mark-light.png
├─ supabase/
│  ├─ migrations/                 مستخرجة من الكتالوج الحي (قراءة فقط):
│  │   0001_schema.sql            الأنواع والجداول والقيود والفهارس والمشغّل
│  │   0002_helpers.sql           مخطط aman والدوال المساعدة
│  │   0003_client_rpcs.sql       11 دالة client_*
│  │   0004_admin_rpcs.sql        35 دالة admin_*
│  │   0005_security.sql          RLS والصلاحيات والإلغاءات
│  │   0006_reference_data.sql    أسباب الرفض + مفاتيح المحتوى (بدون بيانات تشغيلية)
│  └─ tests/security_and_rules.sql  اختبارات SQL بمعاملة تُلغى — تُشغَّل فقط على بيئة غير الإنتاج وبموافقة
├─ scripts/
│  ├─ validate.mjs                فحص الملفات والمسارات والصياغة والاستقلال
│  ├─ build.mjs                   تجميع dist/ وختم معرّف الإصدار في عاملي PWA
│  └─ serve.mjs                   خادم ثابت محلي بلا أي محوّل بيانات
├─ tests/
│  ├─ adapter.test.mjs            المحوّل مقابل عميل Supabase اختباري
│  ├─ pwa.test.mjs · theme.test.mjs
│  ├─ independence.test.mjs       لا مراجع إلى AMAN.B/AMAN.C، لا محاكاة، لا أسرار، مسارات صحيحة
│  └─ (اختبارات القواعد/المتصفح: بحسب قرار استراتيجية الاختبار)
├─ deploy/
│  └─ pages.yml                   قالب GitHub Actions للنشر — غير مفعّل (التفعيل بموافقة مستقلة)
└─ docs/
   ├─ ARCHITECTURE.md             البنية والتحميل والاعتماديات
   ├─ SPEC-CLIENT.md              الشاشات والوظائف
   ├─ SPEC-ADMIN.md               الأقسام والوظائف
   ├─ BUSINESS-RULES.md           المصادقة، الأهلية، المهام، المصادرة، التنشيط
   ├─ SERVICES-CONTRACT.md        العقود ورموز الأخطاء
   ├─ DATABASE.md                 الجداول والعلاقات والفهارس والدوال والسياسات
   ├─ SECURITY.md                 الصلاحيات، RLS، الأسرار، PWA والتخزين
   ├─ OPERATIONS.md               الإعداد (Supabase)، البناء، التشغيل المحلي، النشر
   └─ DEVELOPMENT.md              تعليمات التطوير والصيانة والاختبار
```

## ما لا يُنقل عمدًا (مع السبب)
`simulation/` (محاكاة)، `scripts/local-preview.mjs` (يحقن المحاكاة)، `scripts/color-audit/*`, كل `docs/` التاريخية و`AMAN_C_SCREEN_MAP_BASELINE.md`, `.github/workflows/validate-product.yml`, أيقونات v1/v2/SVG غير المستعملة، `supabase/migrations/20261101000100_initial_schema.sql` (لا يطابق القاعدة).

## الاعتماديات بين مجموعات الملفات
`*/index.html` → `shared/*` + `styles/*` + `assets/brand/*` + ملفات التطبيق ؛ `admin/*.js` → `admin/app.js` (التنقل) → `shared/runtime.js` → `shared/supabase-adapter.js` → `shared/config.js` ؛ `*/sw.js` → قائمة تخزين مسبق تتضمن كل ملف واجهة فعلي ؛ `scripts/build.mjs` → `*/sw.js` ؛ `docs/*` ← مطابقة لكل ما سبق.
