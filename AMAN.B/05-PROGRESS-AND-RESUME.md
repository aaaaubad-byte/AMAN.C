# سجل التقدم ونقطة الاستئناف — AMAN.D

آخر تحديث: 2026-11-05 (تحديد صيغة الشعارات وتسجيل P-01 قبل بدء client/*).
المستودع: aaaaubad-byte/AMAN.C · الفرع: rebuild/aman-d.

## الحالة الحالية
**بدأت كتابة AMAN.D.** التجهيز مكتمل (المرحلة 1 والشجرة D1 وD2 وD3 وC-35 محسومة). تفاصيل التجهيز في 13.
**مجموعة `shared/` مكتملة (7 من 7).**
**مجموعة `styles/` مكتملة (3 من 3).**
**مجموعة `assets/brand/`: مؤجلة بسبب P-01 (أصول ثنائية).**

### ملفات أُعيدت كتابتها (مجموعة shared)
| الملف | الحالة | المصدر | Commit |
|---|---|---|---|
| AMAN.D/shared/config.js | مكتمل | services/supabase-config.js | e4bf18e |
| AMAN.D/shared/runtime.js | مكتمل (بلا مسار محاكاة) | services/runtime.js + CONTRACTS.md | 1f1176b |
| AMAN.D/shared/supabase-adapter.js | مكتمل (35 دالة إدارة RPC + 10 عميل + 5 مصادقة عميل؛ التحويلان محفوظان؛ مفاتيح الجلسات القديمة مُعادة وفق E-01) | services/supabase-adapter.js | 6951b74 ثم 75e1304 |
| AMAN.D/shared/theme.js | مكتمل (جزءان: تفضيل السمة + حقن styles/visual.css وshared/ui-icons.js) | services/theme.js + tests/theme.test.mjs | لم يُسجَّل هاشه (انظر E-04) |
| AMAN.D/shared/ui-icons.js | مكتمل (21 أيقونة وبصماتها SIGS مطابقة للمصدر؛ شريط البطاقات؛ خانات الرئيسية الثلاث الفارغة) | services/aman-ui-v6.js | لم يُسجَّل هاشه (انظر E-04) |
| AMAN.D/shared/compact-filters.js | مكتمل (السلوك محفوظ؛ أيقونات الفلاتر خطية عمدًا لأن ui-icons يستبدلها ببصمة المسار) | services/compact-filters.js | e5636f7 |
| AMAN.D/shared/pull-to-refresh.js | مكتمل (العقد `AMANPullToRefresh.register`، العتبة 76، أسماء الشاشات كما في المصدر) | services/pull-to-refresh.js | dfcbbfb |

### ملفات أُعيدت كتابتها (مجموعة styles)
| الملف | الحجم | الحالة | المصدر | Commit |
|---|---|---|---|---|
| AMAN.D/styles/base.css | 43912 بايت | مكتمل (انظر E-06 وE-07) | styles/app.css (طبقاته المتراكمة مدمجة بنتيجتها الفعلية) | غير مسجَّل (E-09) |
| AMAN.D/styles/visual.css | 11956 بايت | مكتمل (انظر E-08) | styles/visual-v6.css | غير مسجَّل (E-09) |
| AMAN.D/styles/admin-login.css | 5270 بايت | مكتمل | admin/login.css | غير مسجَّل (E-09) |

التحقق الموضعي المنجز: قوائم العقود في runtime مطابقة حرفيًا لمصدرها؛ أسماء RPC في المحوّل مطابقة للمصدر؛ theme.js وui-icons.js مطابقان وظيفيًا لمصدريهما؛ بصمات أيقونات compact-filters تطابق SIGS في ui-icons. وفي مجموعة styles: قرئ الملفان الأصليان `styles/app.css` و`styles/visual-v6.css` كاملين وقورنا بالملفات الثلاثة؛ الملفات الثلاثة تنتهي نهاية سليمة (لا اقتطاع)؛ قيم الرموز الفاتحة والداكنة والهندسة وكتل الفلاتر المدمجة والأيقونات الثنائية مطابقة للنتيجة الفعلية بعد تسلسل الطبقات. **لم يُشغَّل أي اختبار بعد** (لا اختبارات في هذه المرحلة).

### سجل المشكلات والقرارات المؤجلة (مركزي)
| المعرّف | الحالة | المسألة | الملفات المتأثرة | السبب | الأثر | الخيارات | القرار المطلوب |
|---|---|---|---|---|---|---|---|
| **P-01** | **مؤجلة** | الأصول الثنائية PNG لا يمكن نسخها بأدوات المستودع المتاحة (نصية فقط: قراءة وكتابة سلاسل). المصدر في AMAN.C على main: `assets/brand/logo-mark-v2.png` (157290 بايت) و`logo-mark-light-v2.png` (66238 بايت) وفق R2؛ وكذلك أيقونات PWA (`client/icons/*-v3.png` و`admin/icons/*-v3.png`، 4 لكل تطبيق) وفق R1. الشعاران SVG (`logo-mark.svg` و`logo-mark-light.svg`) موجودان لكنهما غير مستعملين وفق R2، ولا يُستبدل بهما PNG دون قرار (يغيّر المظهر والعقد). | `assets/brand/logo-mark.png` · `assets/brand/logo-mark-light.png` · `client/icons/*` (4) · `admin/icons/*` (4) · مراجع HTML/manifest/precache إليها | عدم وجود وسيلة نسخ ثنائي بايتًا ببايت في هذه الجلسة؛ كتابة PNG كنص تُفسد الملف. | مراجع الملفات تُكتب في HTML وmanifest وprecache بأسمائها النهائية، فتبقى الصور غير موجودة في AMAN.D إلى حين نسخها (الشعار لا يظهر وأيقونات التثبيت تنقص). لا تأثير على المنطق. | (أ) نسخ الملفات الثمانية عشر بـ`git` من جلسة تملك وصولًا ثنائيًا إلى `AMAN.D/` في الفرع نفسه بالأسماء المثبتة في 04 (مفضّل، يطابق R1/R2 حرفيًا). (ب) اعتماد SVG بديلًا للشعار فقط (يتطلب قرارًا بتعديل R2). لا يُنفَّذ (ب) دون موافقتك. | اختيار (أ) أو (ب) |

### قرارات تنفيذ مسجلة (للمراجعة وللدمج في 03)
- **E-01 — محسوم/منفذ (Commit 75e1304).** بتوجيه المالك: الاستقلال لا يعني تغيير أسماء مفاتيح التخزين. أُعيدت المفاتيح القديمة كما في المصدر: `aman_c_client_auth` و`aman_c_admin_auth` و`aman_c_admin_remember`، فتبقى جلسات المستخدمين الحاليين سارية عند النشر على النطاق نفسه ولا حاجة لانتقال. هي قيم نصية ثابتة لا اعتماد تشغيلي فيها على أي ملف أو مشروع آخر. لم تثبت ضرورة معمارية لانتقال المفاتيح فلم يُنفَّذ انتقال. المصدر: services/supabase-adapter.js (ADMIN_AUTH_KEY وADMIN_REMEMBER_KEY و`"aman_c_" + scope + "_auth"`).
- **E-02** أزيل `status().simulation` وقبول `candidate.simulation` من runtime (R9). لا أثر على الواجهات إن لم تقرأ هذا الحقل — يُتحقق منه عند كتابة الواجهات.
- **E-03** لا تغيير في السلوك الوظيفي للمحوّل (المهلة 20 ثانية، محاولة واحدة بعد تجديد JWT، لا إعادة محاولة للعمليات المغيِّرة، «تذكرني»، التحويلان `subscription→activation` و`items:{}`).
- **E-04 — محسوم/منفذ.** theme.js وui-icons.js وُجدا مكتوبين في الفرع قبل تحديث السجل (انقطعت الجلسة بينهما)، فجرى التحقق من مطابقتهما للمصدر بدل إعادة كتابتهما. لا أثر وظيفي.
- **E-05 — للتحقق عند كتابة الواجهات:** عقود أحداث ومعرّفات تعتمد عليها ملفات shared ويجب أن توفرها الواجهات: `window.AMANAdminNavigation.current` و`window.AMANClientNavigation.current` (pull-to-refresh)، الحدث `aman:admin-screenchange` (compact-filters)، معرّفات `#home-screen` و`.page-head` و`.admin-stats` (ui-icons)، `#admin-generic-view` و`#request-detail-view` (pull-to-refresh)، السمات `[data-theme-setting]` و`picture source[data-theme-dark-logo]` (theme)، و`meta[name="theme-color"]`. وأصناف CSS التي يجب أن يعرّفها styles/visual.css/base.css: `.ami` و`.aman-carousel-track` و`.aman-dots` و`.aman-dot` و`.aman-home-cards` و`.aman-slot` و`.compact-filter*` و`.compact-search`. **حالة التغطية بعد كتابة styles:** جميع هذه الأصناف معرَّفة في visual.css/base.css (تحقق بالقراءة). يبقى جزء المعرّفات والأحداث للتحقق عند كتابة الواجهات.
- **E-06 — محسوم/منفذ (styles/base.css).** قاعدة دمج `app.css`: الملف المصدر طبقات متراكمة (طبقة الواجهة الأولى، ثم «AMAN.Y adaptation»، ثم «Screen-specific refinement»، ثم «visual layer refinement»، ثم «visual identity refinement»، ثم «user-defined unified screen layout (2026-11-04)»، ثم الفلاتر المدمجة، ثم «brand calibration»، ثم نظام الأيقونات الثنائية). كتب base.css لكل عنصر القاعدة الفعلية النهائية وفق أحدث طبقة معتمدة، ونقل الألوان الحرفية إلى رموز في كتلتي `:root` و`html[data-theme="dark"]`. أُبقي `!important` حيث يشكّل جزءًا من النتيجة الفعلية فقط (الفلاتر المدمجة وإخفاء أزرار التحديث اليدوي وتصغير حاوية الفلاتر). أُسقطت قواعد `.compact-filter-icon[aria-expanded="true"]` لأن compact-filters.js يضبط `.is-expanded` و`aria-expanded` معًا دائمًا (تحقق بقراءة الملف) والقاعدة `.is-expanded` أقوى وأحدث في المصدر. رموز جديدة معرَّفة لتوحيد القيم: `--glyph` و`--depth-*` و`--field-*` و`--on-accent` و`--icon-cut-on-accent` و`--icon-detail-on-accent` و`--muted-2` و`--nav-ink` و`--tab-ink` و`--handle` و`--state-*` و`--soft-*` و`--note-*` و`--brand-symbol-bg`؛ قيمها مأخوذة من الألوان الحرفية الفعلية في المصدر لا من تخمين.
- **E-07 — منفذ جزئيًا، تنظيف معلّق (أولوية منخفضة).** تعليق رأس styles/base.css يذكر اسم ملف التوثيق خارج AMAN.D («AMAN.B/05 ← E-06»). هذا تعليق لا اعتماد تشغيلي فيه، لكنه يخالف شرط خلو AMAN.D من أي إشارة إلى AMAN.B. يُحذف الإشارة في تمريرة تنظيف لاحقة مع أي تعديل قادم على base.css، ويُتحقق منه في اختبار الاستقلال النهائي. لم يُعد كتابة الملف الآن (44 كيلوبايت) لأجل تعليق فقط.
- **E-08 — ملاحظة تكافؤ (لا إجراء).** في visual.css قسم 6 طُبّقت قاعدة بطاقات الإحصاءات الفيروزية بـ`!important` على `.admin-stats.aman-carousel-track .stat-card` كله، بينما في المصدر القاعدة الأخيرة بـ`!important` كانت محصورة بـ`.admin-app #dashboard-screen>…>.stat-card`. النتيجة متطابقة ما دام شريط الإحصاءات يظهر في لوحة الإدارة الرئيسية فقط. يُتحقق منه بصريًا عند الاختبارات الشاملة.
- **E-09 — ملاحظة سجل.** ملفات styles الثلاثة كانت مكتوبة في الفرع حين بدأت جلسة سابقة، ولم يُحدَّث السجل بعد كتابتها (انقطعت الجلسة السابقة قبل أي رد). أدوات المستودع المتاحة لا تعرض تاريخ الـ commits ولا هاشاتها، فلم تُسجَّل هاشاتها؛ تُستخرج عند أول وصول إلى سجل Git. لم يُعد كتابة أي من الملفات الثلاثة.
- **E-10 — محسوم.** صيغة الشعارات: PNG وفق R2 (لا SVG). المصدر على main موجود ومؤكَّد بالقائمة (`logo-mark-v2.png` و`logo-mark-light-v2.png`). التنفيذ مؤجل بسبب P-01.
- **ملاحظة تحقق (للمجموعة الأخيرة، الجذر):** يحتوي AMAN.D مسبقًا على ملفات جذر موجودة (`.gitignore` و`README.md` و`index.html` و`package.json`) ومجلدات للبقية فيها هياكل أولية صغيرة (مثل client/app.js وclient/sw.js وclient/index.html وclient/manifest.webmanifest بأحجام 117 إلى 401 بايت) و`.gitkeep`. هذه ليست نهائية وتُعاد كتابتها وفق الشجرة.

## الملفات المرجعية الحاكمة
13-SUPABASE-DEEP-AUDIT-AND-READY.md: أحدث تقرير الجاهزية.
04-FILE-TREE-PROPOSED.md: الشجرة المعتمدة.
08-LIVE-DB-REVIEW.md: جرد قاعدة الإنتاج.
03-DECISIONS-AND-CONFLICTS.md: القرارات والتعارضات.
09-UI-SOURCES-AND-PRESERVATION.md: مصادر الواجهات.
02-DEPENDENCIES.md: الاعتماديات.

## ما لم يُنفذ ولا يجوز ادعاء اكتماله
- كل ما سوى ملفات `shared/` السبعة و`styles/` الثلاثة لم يُكتب بعد داخل AMAN.D (الأصول الثنائية [P-01]، العميل، الإدارة، supabase، scripts، tests، deploy، docs، الجذر). `assets/brand/` فيه `.gitkeep` فقط.
- لا اختبارات SQL ديناميكية أو اختبارات قواعد مهام؛ Q3 يحتاج بيئة تطوير مستقلة وموافقة تكلفة إن وجدت.
- لم تُراجع إعدادات Auth كاملة من لوحة التحكم؛ المؤكد فقط أن leaked-password protection معطلة.
- لم تُشغّل اختبارات متصفح أو تحقق بصري.
- لم تُجر تغييرات على قاعدة الإنتاج أو بياناتها أو إعداداتها.
- لم يحدث نشر أو دمج أو تعديل main. AMAN.D يستخدم قاعدة بيانات AMAN.C الحالية نفسها بلا قاعدة جديدة.

## نقطة الاستئناف الدقيقة
**الملف التالي:** `AMAN.D/client/*`. الأصول الثنائية مؤجلة (P-01) ولا تمنع المتابعة: تُكتب مراجعها بأسمائها النهائية (`../assets/brand/logo-mark.png` و`logo-mark-light.png` وأيقونات `icons/`).
الترتيب داخل client: `index.html` ← `app.js` ← `pwa.js` ← `sw.js` ← `manifest.webmanifest`. المصادر: `client/index.html`، `client/app.js`، `client/ui-v5.js` (تبويب تصفية الإشعارات وC-35)، `client/pwa.js`، `client/sw.js`، `client/manifest.webmanifest`، `services/CONTRACTS.md`، وخريطة الشاشات §4–8 في `AMAN_C_SCREEN_MAP_BASELINE.md`.
ثم: `admin/*` ← `supabase/migrations/*` (نسخ حرفي مع التحقق من SHA-256 كما في 13) ← `scripts/*` ← `tests/*` ← `deploy/pages.yml` ← `docs/*` ← الجذر (`package.json`, `.gitignore`, `index.html`, `README.md`).
عند كتابة `client/*` و`admin/*`: تحقق من عقود E-05 (المعرّفات والأحداث) وE-02 (عدم قراءة `simulation`)، وR17 وC-35 (لوحة الرقم، `#operation-sheet`)، وعدم وجود فرع «وضع المحاكاة» في `renderAuthFoot`.
لكل ملف: قراءة المصدر والاعتماديات، تحديد العقد، الكتابة، التحقق الموضعي، التوثيق هنا.
ملفات SQL الستة تنسخ حرفيًا من statements[1] وفق الأسماء المثبتة في 13 ولا تُطبّق على الإنتاج.

## سجل التحديثات
- 2026-11-05: اكتمل تدقيق Supabase وحُسمت D1/D2/D3/C-35 (انظر 13).
- 2026-11-05: بدء التنفيذ — config.js وruntime.js وsupabase-adapter.js، وتسجيل E-01…E-03.
- 2026-11-05: تسوية E-01 بإعادة مفاتيح الجلسات القديمة (Commit 75e1304).
- 2026-11-05: اكتمال shared: التحقق من theme.js وui-icons.js (E-04)، وكتابة compact-filters.js (e5636f7) وpull-to-refresh.js (dfcbbfb).
- 2026-11-05: التحقق من حالة الفرع بعد انقطاع جلسة بلا رد: وُجدت styles/base.css وvisual.css وadmin-login.css مكتوبة وكاملة ولم تُسجَّل؛ قورنت بالمصدرين وسُجّلت (E-06…E-09) دون إعادة كتابة.
- 2026-11-05: تحديد صيغة الشعارات (E-10: PNG) وتسجيل P-01 (الأصول الثنائية مؤجلة). نقطة الاستئناف: `client/index.html`.
