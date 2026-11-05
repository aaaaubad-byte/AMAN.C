# تاريخ المستودع AMAN.C والفروع

مصدر الأرقام: سجل git الكامل (غير سطحي) عند HEAD `0c37d34`، وجلب كل الفروع البعيدة. لا وسوم (tags).

## 1. الأرقام
- `main`: **275 التزامًا** من 2026-11-01 01:40 إلى 2026-11-05 02:23 (بتوقيت عدن).
- كل الالتزامات في كل الفروع: 538.
- الفروع البعيدة: 44 = `main` + `rebuild/aman-d` (هذا العمل) + **42 فرعًا آخر**: 11 مدموجة في `main`، و31 غير مدموجة.
- الالتزامات حسب اليوم على `main`: 11-01 = 111، 11-02 = 0، 11-03 = 35، 11-04 = 119، 11-05 = 10.

## 2. الخط الزمني على `main`

| الفترة | ما جرى (من رسائل الالتزامات وعمليات الدمج) |
|---|---|
| 11-01 صباحًا | أول التزام (اختبار صلاحية الكتابة)، هيكل التطبيق (المرحلة 1)، شاشات الإدارة A1–A31 على فروع مرحلية، وضع Demo (دمج 04:20). |
| 11-01 بعد الظهر–20:05 | **P0**: طبقة خدمات موحدة ومحوّل محاكاة معزول بدل demo؛ قرارات المهام والمصادرة (D2/D4/D5/D6)؛ شاشة «نافذة الظهور والمتابعة»؛ D1 (التنقل) وD3 (دخول العميل) وD9 (وسائل الدفع)؛ اختبارات العزل والعقود. دمج «AMAN.C complete development» 20:04 ثم «نشر معاينة المحاكاة المعزولة» 20:05. |
| 11-03 | مرجع الواجهة v5 (دمج 04:37 و#15 05:36)، ربط محوّل Supabase بالصفحتين (05:34)، PWA مستقل للتطبيقين (Service Worker وmanifest وأيقونات)، «نشر إنتاجي آمن فقط» (18:24). |
| 11-04 | هوية الشعار والأيقونات، شاشة دخول الإدارة، إعادة تصميم الواجهة وفق مرجع AMAN.Y (#16)، مقياس الخطوط، اختصار النصوص، رؤوس الشاشات الموحدة، أشرطة البحث والفلترة، السحب للتحديث، الأيقونات ثنائية اللون (PR #19–#25 وما بعدها). |
| 11-05 | الطبقة البصرية v6، قاعدة فاتحة محايدة وأسطح بيضاء، بطاقات تركوازية، عمق بصري (آخر التزام `0c37d34`). |

ملاحظات: لا التزامات في 11-02. التزامات 11-01 تتضمن مراحل كاملة من تطوير الوظائف؛ التزامات 11-03 وما بعدها تتركز على التكامل مع Supabase وPWA ثم الواجهة المرئية. وثائق الحالة (`PROGRESS_LOG.md`) توقفت عند الجلسة 4 (11-01) ولم تواكب الربط بـ Supabase.

## 3. الفروع المدموجة (11) — لا شيء فريد فيها
`feature/phase-3-admin-a1-a4`، `feature/phase-3-admin-a9-a12`، `feature/demo-mode-preview`، `fix/isolated-simulation-preview`، `feature/aman-c-ui-reference-v5`، `fix/aman-c-typography-scale-from-aman-y`، `feature/aman-c-ui-from-main-aman-y`، `feature/aman-c-auth-toolbar-alignment`، `fix/aman-c-customer-auth-visual-layout`، `feature/aman-c-duotone-icons`، `fix/unified-search-filter-feedback`.

## 4. الفروع غير المدموجة (31)

المقياس: نسبة الأسطر المضافة في الفرع (منذ نقطة التقائه مع `main`) الموجودة حرفيًا في ملفاتها على `main`. **مؤشر استدلالي وليس إثباتًا**: النسبة المنخفضة قد تعني عملًا فريدًا غير مدموج، أو عملًا حلّ محله تعديل لاحق على `main`. الحسم يتم ملفًا ملفًا في المرحلة 4.

### أ) محتواها موجودة في `main` تقريبًا (≥ 94%) — دمج بأسلوب squash/نسخ
`docs/screen-map-baseline` 100% · `feature/aman-c-color-system` 100% · `feature/aman-c-visual-depth` 100% · `fix/admin-stats-turquoise-carousel` 100% · `fix/dynamic-admin-filter-colors` 100% · `refine-unified-search-filter-controls` 100% · `feature/aman-c-home-cards-turquoise` 98% · `design/refined-duotone-icons` 98% · `feature/refine-inline-search-controls` 95% · `feature/aman-c-unified-screen-headers` 94%.

### ب) نسبة متوسطة إلى عالية (56–90%) — تتطلب فحص الفروق
`fix/unified-pull-to-refresh` 90% · `feature/visual-v6` 89% · `feature/aman-c-ui-work` 80% · `feature/compact-search-icon-filters` 79% · `feature/real-product-foundation` 72% · `fix/brand-colors-and-admin-filters` 70% · `fix/unified-list-feedback` 68% · `fix/dynamic-admin-compact-filters` 60% · `fix/a23-prefix-validation` 56%.

### ج) نسبة منخفضة (< 50%) — الأكثر احتمالًا لاحتواء عمل غير مدموج أو متجاوَز
| الفرع | النسبة | ما يُلاحظ |
|---|---|---|
| `feature/phase-3-admin-a9-a12-v2` | 43% | نسخة ثانية من شاشات العملاء؛ `main` يحمل نسخة أحدث |
| `feature/phase-1-app-shell` | 36% | هيكل المرحلة 1 وسير عمل قديم |
| `feature/admin-a18-a25` | 19% | شاشات الإدارة A18–A25 (البلاغات، الشركات، الإشعارات) |
| `feat/admin-pull-to-refresh` | 4% | سحب للتحديث؛ `main` فيه `services/pull-to-refresh.js` بصيغة أحدث |
| **`feature/aman-c-complete-development`** | **2%** | 25 التزامًا: `LOCAL_PREVIEW.md`، `tests/browser-client.test.js`، تعديلات `deploy.yml` و`validate-product.yml`، درجات تحقق الشاشات في خريطة الشاشات، وملفات شعار/علامة من 11-04 مبكرًا (حلّ محلها شعار `main`). الفرع الذي تذكره وثائق الاستئناف كفرع التطوير |
| `feature/aman-c-ui-redesign` | 1% | `UI_DESIGN_SYSTEM.md` وخطط التصميم واختبار `ui-redesign` — لا أثر لها في `main` |
| `fix/demo-login-flow`، `fix/client-catalog-integration` | 0% | إصلاحات على نسخة قديمة من الشاشات والمحاكاة |
| `feature/admin-a26-a31` | 0% | الباقات ووسائل الدفع (النسخة المبكرة) |
| `feature/neutral-light-base`، `feature/theme-layer-reversal`، `feature/white-screen-base` | 0% | سلسلة تجارب خلفية فاتحة؛ `main` فيه التزامات مكافئة بعبارات مختلفة |

## 5. أثر ذلك على إعادة البناء
1. **المصدر المعتمد هو `main`** (حسب التوجيه)؛ الفروع مراجع لاستخلاص المعلومات فقط.
2. الفرع الوحيد الذي يستحق قراءة مفصلة قبل البدء بالملفات المتأثرة: `feature/aman-c-complete-development` (قد يحمل اختبارات متصفح للعميل وتصميم تحقق CI غير موجودين في `main`) و`feature/aman-c-ui-redesign` (وثائق تصميم لم تُدمج).
3. قبل كتابة كل ملف في المرحلة 4 تُقارَن نسخته في `main` بنسخ الفروع التي عدّلته، ويُسجَّل الحسم في `03-DECISIONS-AND-CONFLICTS.md`.
4. وثائق التاريخ (`docs/*`) في `main` — 22 ملفًا — قُرئت منها: `README`, `DECISIONS`, `PROGRESS_LOG`, `SUPABASE_*`, `UI_REDESIGN_STATUS`, `UI_V5_PENDING_CHANGES`. **لم تُقرأ بعد**: `CONTINUATION_DIRECTIVE*` (4)، `ORIGINAL_DIRECTIVE`، `PHASE_*_IMPLEMENTATION` (7)، `DEMO_MODE_DESIGN`، `COLOR_SYSTEM_PROGRESS`، `UI_V5_PROGRESS`، `design/README` و`AMAN_C_SCREEN_MAP_BASELINE.md`؛ تُقرأ قبل ملفات المرحلة 4 المرتبطة بها.
