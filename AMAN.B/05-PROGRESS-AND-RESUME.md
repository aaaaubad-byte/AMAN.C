# سجل التقدم ونقطة الاستئناف — AMAN.D

آخر تحديث: 2026-11-05 (اكتمال مجموعة shared).
المستودع: aaaaubad-byte/AMAN.C · الفرع: rebuild/aman-d.

## الحالة الحالية
**بدأت كتابة AMAN.D.** التجهيز مكتمل (المرحلة 1 والشجرة D1 وD2 وD3 وC-35 محسومة). تفاصيل التجهيز في 13.
**مجموعة `shared/` مكتملة (7 من 7).**

### ملفات أُعيدت كتابتها (مجموعة shared)
| الملف | الحالة | المصدر | Commit |
|---|---|---|---|
| AMAN.D/shared/config.js | مكتمل | services/supabase-config.js | e4bf18e |
| AMAN.D/shared/runtime.js | مكتمل (بلا مسار محاكاة) | services/runtime.js + CONTRACTS.md | 1f1176b |
| AMAN.D/shared/supabase-adapter.js | مكتمل (35 دالة إدارة RPC + 10 عميل + 5 مصادقة عميل؛ التحويلان محفوظان؛ مفاتيح الجلسات القديمة مُعادة وفق E-01) | services/supabase-adapter.js | 6951b74 ثم 75e1304 |
| AMAN.D/shared/theme.js | مكتمل (جزءان: تفضيل السمة + حقن styles/visual.css وshared/ui-icons.js) | services/theme.js + tests/theme.test.mjs | كُتب قبل تحديث السجل السابق؛ لم يُسجَّل هاشه (انظر E-04) |
| AMAN.D/shared/ui-icons.js | مكتمل (21 أيقونة وبصماتها SIGS مطابقة للمصدر؛ شريط البطاقات؛ خانات الرئيسية الثلاث الفارغة) | services/aman-ui-v6.js | كُتب قبل تحديث السجل السابق؛ لم يُسجَّل هاشه (انظر E-04) |
| AMAN.D/shared/compact-filters.js | مكتمل (السلوك محفوظ؛ أيقونات الفلاتر خطية عمدًا لأن ui-icons يستبدلها ببصمة المسار) | services/compact-filters.js | e5636f7 |
| AMAN.D/shared/pull-to-refresh.js | مكتمل (العقد `AMANPullToRefresh.register`، العتبة 76، أسماء الشاشات كما في المصدر) | services/pull-to-refresh.js | dfcbbfb |

التحقق الموضعي المنجز: قوائم العقود في runtime مطابقة حرفيًا لمصدرها؛ أسماء RPC في المحوّل مطابقة للمصدر؛ محتوى theme.js وui-icons.js قورن بمصدريهما ووُجد مطابقًا وظيفيًا (الفرق في التعليقات والمسارين النسبيين `../styles/visual.css` و`./ui-icons.js` فقط، وهما يطابقان الشجرة)؛ بصمات أيقونات compact-filters تطابق SIGS في ui-icons؛ لا ذكر لـ AMAN.B/AMAN.C ولا للمحاكاة داخل ملفات shared (النص «AMAN» العام فقط). **لم يُشغَّل أي اختبار بعد** (لا اختبارات في هذه المرحلة).

### قرارات تنفيذ مسجلة (للمراجعة وللدمج في 03)
- **E-01 — محسوم/منفذ (Commit 75e1304).** بتوجيه المالك: الاستقلال لا يعني تغيير أسماء مفاتيح التخزين. أُعيدت المفاتيح القديمة كما في المصدر: `aman_c_client_auth` و`aman_c_admin_auth` و`aman_c_admin_remember`، فتبقى جلسات المستخدمين الحاليين سارية عند النشر على النطاق نفسه ولا حاجة لانتقال. هي قيم نصية ثابتة لا اعتماد تشغيلي فيها على أي ملف أو مشروع آخر. لم تثبت ضرورة معمارية لانتقال المفاتيح فلم يُنفَّذ انتقال. المصدر: services/supabase-adapter.js (ADMIN_AUTH_KEY وADMIN_REMEMBER_KEY و`"aman_c_" + scope + "_auth"`).
- **E-02** أزيل `status().simulation` وقبول `candidate.simulation` من runtime (R9). لا أثر على الواجهات إن لم تقرأ هذا الحقل — يُتحقق منه عند كتابة الواجهات.
- **E-03** لا تغيير في السلوك الوظيفي للمحوّل (المهلة 20 ثانية، محاولة واحدة بعد تجديد JWT، لا إعادة محاولة للعمليات المغيِّرة، «تذكرني»، التحويلان `subscription→activation` و`items:{}`).
- **E-04 — محسوم/منفذ.** وُجد في بداية هذه الجلسة أن theme.js وui-icons.js مكتوبان في الفرع قبل أن يُحدَّث السجل (انقطعت الجلسة السابقة بينهما)، فجرى التحقق من مطابقتهما للمصدر بدل إعادة كتابتهما. لا أثر وظيفي.
- **E-05 — للتحقق عند كتابة الواجهات:** عقود أحداث ومعرّفات تعتمد عليها ملفات shared ويجب أن توفرها الواجهات: `window.AMANAdminNavigation.current` و`window.AMANClientNavigation.current` (pull-to-refresh)، الحدث `aman:admin-screenchange` (compact-filters)، معرّفات `#home-screen` و`.page-head` و`.admin-stats` (ui-icons)، `#admin-generic-view` و`#request-detail-view` (pull-to-refresh)، السمات `[data-theme-setting]` و`picture source[data-theme-dark-logo]` (theme)، و`meta[name="theme-color"]`. وأصناف CSS التي يجب أن يعرّفها styles/visual.css/base.css: `.ami` و`.aman-carousel-track` و`.aman-dots` و`.aman-dot` و`.aman-home-cards` و`.aman-slot` و`.compact-filter*` و`.compact-search`.
- **ملاحظة تحقق (للمجموعة الأخيرة، الجذر):** يحتوي AMAN.D مسبقًا على ملفات جذر موجودة (`.gitignore` و`README.md` و`index.html` و`package.json`) ومجلدات فارغة للبقية. تُراجع هذه الملفات عند الوصول إلى مجموعة الجذر وتُعاد كتابتها وفق الشجرة بدل افتراض أنها نهائية.

## الملفات المرجعية الحاكمة
13-SUPABASE-DEEP-AUDIT-AND-READY.md: أحدث تقرير الجاهزية.
04-FILE-TREE-PROPOSED.md: الشجرة المعتمدة.
08-LIVE-DB-REVIEW.md: جرد قاعدة الإنتاج.
03-DECISIONS-AND-CONFLICTS.md: القرارات والتعارضات.
09-UI-SOURCES-AND-PRESERVATION.md: مصادر الواجهات.
02-DEPENDENCIES.md: الاعتماديات.

## ما لم يُنفذ ولا يجوز ادعاء اكتماله
- كل ما سوى ملفات `shared/` السبعة أعلاه لم يُكتب بعد داخل AMAN.D (الأنماط، الأصول، العميل، الإدارة، supabase، scripts، tests، deploy، docs، الجذر).
- لا اختبارات SQL ديناميكية أو اختبارات قواعد مهام؛ Q3 يحتاج بيئة تطوير مستقلة وموافقة تكلفة إن وجدت.
- لم تُراجع إعدادات Auth كاملة من لوحة التحكم؛ المؤكد فقط أن leaked-password protection معطلة.
- لم تُشغّل اختبارات متصفح أو تحقق بصري.
- لم تُجر تغييرات على قاعدة الإنتاج أو بياناتها أو إعداداتها.
- لم يحدث نشر أو دمج أو تعديل main. AMAN.D يستخدم قاعدة بيانات AMAN.C الحالية نفسها بلا قاعدة جديدة.

## نقطة الاستئناف الدقيقة
**الملف التالي:** `AMAN.D/styles/base.css` (المصدر: styles/app.css + COLOR_SYSTEM_PROGRESS + السلوك الناقص من ui-redesign؛ قواعد R13 وR14 وC-06 وC-07 وC-21).
ثم: `styles/visual.css` (من styles/visual-v6.css، مدمجًا وفق R12 ويلبّي أصناف E-05) ← `styles/admin-login.css` (من admin/login.css) ← `assets/brand/*` (نسخ ثنائي للشعارين) ← `client/*` ← `admin/*` ← `supabase/migrations/*` (نسخ حرفي مع التحقق من SHA-256 كما في 13) ← `scripts/*` ← `tests/*` ← `deploy/pages.yml` ← `docs/*` ← الجذر (`package.json`, `.gitignore`, `index.html`, `README.md`).
لكل ملف: قراءة المصدر والاعتماديات، تحديد العقد، الكتابة، التحقق الموضعي، التوثيق هنا.
ملفات SQL الستة تنسخ حرفيًا من statements[1] وفق الأسماء المثبتة في 13 ولا تُطبّق على الإنتاج.

## سجل التحديثات
- 2026-11-05: اكتمل تدقيق Supabase وحُسمت D1/D2/D3/C-35 (انظر 13).
- 2026-11-05: بدء التنفيذ — config.js وruntime.js وsupabase-adapter.js، وتسجيل E-01…E-03.
- 2026-11-05: تسوية E-01 بإعادة مفاتيح الجلسات القديمة (Commit 75e1304).
- 2026-11-05: اكتمال shared: التحقق من theme.js وui-icons.js (E-04)، وكتابة compact-filters.js (e5636f7) وpull-to-refresh.js (dfcbbfb). نقطة الاستئناف: `styles/base.css`.
