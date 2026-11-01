# عقود الخدمات — AMAN.C

هذا المستند هو المرجع الذي تُبنى عليه كل المحوّلات (adapters): محوّل المحاكاة المحلية الحالي (`simulation/simulation-adapter.js`) وأي محوّل لقاعدة بيانات لاحقًا. **لم يُختر مزود قاعدة بيانات ولم يُربط شيء** (قرار D13 مؤجل)؛ ما يرد هنا قواعد عمل وأشكال بيانات لا ترتبط بمزود.

الواجهات (`client/` و`admin/`) لا تتعامل إلا مع `window.AMANClientServices` و`window.AMANAdminServices` المعرَّفتين في `services/runtime.js`. تُفوَّض كل عملية إلى المحوّل المسجَّل. أسماء العمليات الملزمة مجمّدة في `CONTRACTS` داخل `runtime.js`، ويختبر `tests/contract.test.mjs` أن المحوّل ينفذها كلها.

## 1. المبادئ العامة
- **شكل النتيجة:** نجاح `{ success: true, ...بيانات }`؛ فشل `{ success: false, code, message }` حيث `code` نص ثابت للبرمجة و`message` نص عربي يُعرض للمستخدم. تُطبِّع الطبقة الموحدة أي نتيجة غير ناجحة إلى هذا الشكل.
- **لا نجاح زائف:** عند تعذر الاتصال أو الاستثناء تُرجع الطبقة `service_unreachable` ولا تُعرض الواجهة نجاحًا. دون أي محوّل يكون الرمز `service_not_configured`، وعند غياب عملية في محوّل `method_not_implemented`.
- **النجاح بعد النجاح فقط:** لا تعدّل الواجهة حالتها ولا تعرض رسالة نجاح قبل `success: true`.
- **الصلاحيات:** كل عملية غير عامة تتطلب جلسة من نوعها وإلا `auth_required`. جلسة العميل لا تمنح أي صلاحية إدارة، وحسابات الإدارة منفصلة عن حسابات العملاء (`invalid_credentials` عند دخول عميل من بوابة الإدارة).
  - عامة للعميل: `getSession`، `signIn`، `signUp`. عامة للإدارة: `signInAdmin`.
- **الخصوصية:** لا تُعاد كلمات المرور في أي استجابة. العميل لا يرى تفاصيل حماية رقم يخص غيره (حالة `other_protected` بلا باقة ولا تواريخ ولا مالك).
- **الزمن:** التواريخ نصوص ISO بالتوقيت العالمي. التقويم التشغيلي ميلادي وتوقيت `Asia/Aden` (UTC+3 ثابت). «يوم» يعني يوم عدن.
- **البدء فارغًا:** لا شركات ولا باقات ولا وسائل دفع ولا طلبات ولا أرقام ولا عملاء في أي بيئة جديدة. حساب مدير المحاكاة استثناء خاص بالمحاكاة.

## 2. عقود العميل (`AMANClientServices`)
| العملية | المدخل | عند النجاح | رموز الفشل |
|---|---|---|---|
| `getSession` | — | `user` أو `null` (`id, email, full_name, account_type, status`) | — |
| `signIn` | `email, password` | `user` | `invalid_credentials` (يشمل الحساب المعطَّل) |
| `signUp` | `email, password` (≥ 4 أحرف في المحاكاة) | `user` ويدخل مباشرة | `invalid_email`، `weak_password`، `email_taken` |
| `signOut` | — | — | `auth_required` |
| `lookupNumber` | `phone` | `number` بالحالات: `not_subscribed`، `other_protected`، `protected`، `inactive`، `confiscated` | `invalid_number`، `no_companies`، `unknown_prefix`، `invalid_length` |
| `listMyNumbers` | — | `items` (أرقام العميل بحالتها) | — |
| `listMyOperations` | — | `items` (طلباته، مع `rejection_reason`/`rejection_note` عند الرفض) | — |
| `getProtectionCatalog` | `company_id?`، `operation_type?` | `packages`، `payment_methods` (النشطة فقط، مع `account_number` و`reference_required` و`reference_pattern`) | — |
| `submitProtectionRequest` | `phone, operation_type, company_id, package_id, payment_method_id, payment_reference` | `request_id, request_number` | `invalid_request`، `unavailable_package`، `reference_required`، `reference_format`، `reference_pattern_invalid`، `operation_not_allowed`، `reactivation_disabled`، `reactivation_window_closed` |
| `updateProfile` | `full_name` (≤ 120) | — | `invalid_name` |
| `changePassword` | `current_password, new_password` | — | `wrong_password`، `weak_password` |
| `getNotifications` | — | `items` | — |
| `markNotificationRead` | `notification_id` | — | `not_found` |
| `listNumberAlerts` | `phone` (رقم يملكه العميل) | `items` | `not_found` |
| `submitReport` | `phone, reason_code, reason_text?` | `report_id` | `invalid_reason`، `reason_text_required` (للسبب `other`)، `reason_text_too_long` (> 2000)، `report_not_allowed`، `duplicate_report` |

أنواع العمليات: `activation` (اشتراك)، `extension` (تمديد)، `reactivation` (تنشيط). أسباب البلاغ: `mine`، `lost_access`، `unauthorized`، `other`.

## 3. عقود الإدارة (`AMANAdminServices`)
| المجال | العمليات | ملاحظات ورموز الفشل |
|---|---|---|
| الجلسة | `signInAdmin(email,password)`، `getCurrentAdmin`، `signOutAdmin`، `getDashboardSummary` | `invalid_credentials` |
| الطلبات | `listRequests(status?,operation_type?,company_id?,search?)`، `getRequestDetails(request_id)`، `getApprovalPreview(request_id)`، `getRejectReasons`، `approveRequest(request_id)`، `rejectRequest(request_id,reason_code,explanation?)` | `not_found`، `not_pending`، `approval_blocked`، `invalid_reason`، `explanation_too_long` (> 300). الرفض بسبب من القائمة: `bad_reference`، `amount_short`، `not_received`. الاعتماد يعيد فحص الأهلية. |
| الأرقام | `listNumbers(status?,search?)`، `getNumberDetails(number_id)` | `not_found`. حالات الحماية: `protected`، `inactive`، `expired_confiscated`. |
| العملاء | `listCustomers(type?,status?,search?)`، `getCustomerDetails(customer_id)`، `updateCustomerStatus(customer_id,status,reason?)` | `not_found`، `invalid_status_change`. تعطيل الحساب ينهي جلسته. |
| المهام | `listTasks`، `getTaskDetails(task_id)`، `executeTask(task_id)`، `previewTaskReschedule(task_id,new_due_at)`، `rescheduleTask(task_id,new_due_at)` | `not_found`، `task_not_available`، `task_not_executable`، `task_not_reschedulable`، `invalid_date`، `invalid_request` |
| التقارير | `getRevenueReport(days?)` | إيرادات الطلبات المعتمدة |
| البلاغات | `listComplaints`، `decideComplaint(report_id,decision,reason)` | القرار `no_action` أو `terminate_protection`؛ السبب إلزامي؛ `invalid_request`، `no_active_protection` |
| الإشعارات والتنبيهات | `listAdminNotifications`، `createAdminNotification(title,body,customer_id?)`، `listAdminAlerts`، `createAdminAlert(number_id,title,body)` | `invalid_request`، `not_found`، `invalid_relation` |
| الإعدادات | `listCompanies`، `previewCompanySettings`، `saveCompanySettings`، `listPackages`، `savePackage`، `listPaymentMethods`، `savePaymentMethod`، `getAppContent`، `saveAppContent(key,body)` | `validation_failed`، `not_found`، `duplicate_name`، `prefix_conflict`، `reference_pattern_invalid` |
| التدقيق | `listAuditLog(limit?)` | كل إجراء إداري يُسجَّل بالمنفذ والوقت |

حقول الشركة (`saveCompanySettings`): `name, prefixes[], number_lengths[], task_interval_days (≥1), task_due_window_days (≥0، مطلوب لشركة جديدة بلا افتراضي), is_active, create_first_task, reactivation_enabled, reactivation_days (≥0)`. البادئة لا تتكرر بين شركتين والاسم فريد.
حقول وسيلة الدفع (D9): `name, account_number (≤ 100، نص), instructions, reference_required, reference_pattern?, active`. التعديل بلا `account_number` يمسحه.

## 4. قواعد العمل الملزمة (للمحوّل الحالي وللخلفية لاحقًا)
**الأهلية (تُفحص عند الإرسال وعند الاعتماد):**
- اشتراك: الرقم غير موجود، أو ليس محميًا لدى غير المشترك الحالي. مرفوض إن كان محميًا (لدى المالك نفسه أو غيره).
- تمديد: للرقم المحمي لدى حساب العميل فقط.
- تنشيط: للرقم غير النشط لدى حساب العميل، وقبل آخر يوم للتنشيط، وبشرط `reactivation_enabled`.

**المصادرة والمهام (قرارات صاحب المشروع 2026-11-01، انظر `docs/DECISIONS.md`):**
- الفاصل الدوري للشركة هو مهلة المصادرة. لكل رقم محمي مهمة قادمة واحدة موعدها تاريخ المصادرة (آخر لحظة من يوم الموعد بتوقيت عدن).
- تاريخ المصادرة = يوم **مرجع المخطط** + الفاصل. مرجع المخطط (`plan_anchor_at`) هو يوم بداية الاشتراك الأول، ثم يوم آخر مهمة منفذة. لا يغيّره التمديد ولا التنشيط.
- **لا تُنشأ مهمة خارج نطاق الاشتراك:** تُخطَّط التالية فقط إن كان موعدها ≤ نهاية الاشتراك. إن لم تُنشأ يبقى تاريخ المصادرة محسوبًا من المرجع نفسه.
- التنفيذ جائز في أي وقت داخل الفاصل (مبكرًا أيضًا) والرقم محمي فقط (`task_not_executable` بعد انتهاء الاشتراك). التنفيذ يجعل يوم التنفيذ المرجع الجديد.
- تجاوز تاريخ المصادرة دون تنفيذ أو إعادة جدولة ← الرقم مصادَر (حتى أثناء الحماية). لا تبقى مهام متأخرة.
- إعادة الجدولة: للمهمة القادمة وحدها، لأرقام محمية فقط، بتاريخ غير سابق لليوم بتوقيت عدن (التقديم حتى اليوم نفسه، والتأخير بلا قيد)، وتُزاح اللاحقة بالمقدار نفسه.
- نافذة الظهور: تصير المهمة «مستحقة» قبل موعدها بعدد أيام النافذة؛ لا تغيّر الموعد ولا تاريخ المصادرة.
- التنشيط: آخر يوم = تاريخ المصادرة − `reactivation_days` (0 = حتى يوم المصادرة نفسه)؛ بعده `reactivation_window_closed`؛ ويستكمل المخطط من المرجع نفسه فتُنشأ المهمة الناقصة إن صار موعدها ضمن الاشتراك الجديد. التمديد يستكمل المخطط كذلك.
- اشتراك جديد على رقم موجود = مخطط جديد (تُسقط المهام القادمة القديمة ويبدأ المرجع من يوم الاعتماد).
- مفتوح (لم يُحسم): الشركة بإعداد «إنشاء أول مهمة = لا» (لا مخطط مهام)؛ وهل تُمنع إعادة الجدولة إلى ما بعد نهاية الاشتراك.

**الطلبات والمدفوعات:**
- الاعتماد والرفض على طلب `pending` فقط (`not_pending` غير ذلك). الرفض يتطلب سببًا من القائمة وتوضيحًا ≤ 300 حرف، ويصل السبب للعميل بإشعار آلي.
- مرجع الدفع إلزامي إن كان `reference_required`، ويُطابَق `reference_pattern` إن وُجد.
- العميل يشتري الحماية لا عمليات السداد؛ مبلغ السداد وفاصله من الإعدادات الإدارية لا من سعر الباقة.

**البلاغات:** لا يبلّغ العميل عن رقمه، ولا عن رقم غير محمي، ولا يكرر بلاغًا مفتوحًا لرقم واحد. قرار الإدارة بسبب إلزامي؛ `terminate_protection` يجعل الرقم غير نشط ويُشعر المالك.

## 5. ما ستحتاجه قاعدة البيانات لاحقًا (دون اختيار مزود)
- **مصادقة** منفصلة لحسابات العملاء والإدارة، وتخزين كلمات المرور مشفرة بدالة آمنة، وجلسات تنتهي. محوّل المحاكاة يخزن كلمات المرور نصًا وهو غير آمن عمدًا ولا يُستعمل بيانات حقيقية.
- **صلاحيات على مستوى الصف:** العميل يقرأ ويكتب بياناته فقط؛ الإدارة وحدها تعتمد وترفض وتنفذ وتعيد الجدولة وتعدّل الإعدادات.
- **ذرية:** اعتماد الطلب (تحديث الرقم والمهام والإشعار والتدقيق) عملية واحدة تنجح كلها أو تفشل كلها؛ وكذلك تنفيذ المهمة وتخطيط التالية.
- **قيود فريدة:** رقم الهاتف، بريد الحساب، اسم الشركة، بادئة الشركة، رقم الطلب. فهارس على الحالة والتواريخ.
- **المصادرة:** إما حساب حالة الرقم عند القراءة كما في المحاكاة، أو مهمة مجدولة موثوقة، مع التزام توقيت `Asia/Aden`.
- **سجل تدقيق** غير قابل للتعديل للإجراءات الإدارية، **وإشعارات** آلية ويدوية، **ونصوص ثابتة** (`terms, privacy, contact, help`).
- لا مفاتيح ولا عناوين اتصال في ملفات الواجهة؛ ولا تعديل على `supabase/migrations` قبل قرار D13.

## 6. اختبار المطابقة
- `node --test tests/contract.test.mjs` يشغّل الاختبار على محوّل المحاكاة.
- لمحوّل آخر لاحقًا: `AMAN_ADAPTER_FILE=مسار/المحوّل.js AMAN_ADMIN_EMAIL=... AMAN_ADMIN_PASSWORD=... node --test tests/contract.test.mjs`؛ يجب أن يسجّل الملف نفسه عبر `AMANServices.register` وأن يبدأ من حالة فارغة.
- يغطي: اكتمال العمليات، الصلاحيات، الحسابات، الحالة الفارغة، التحقق، دورة الاعتماد والرفض والخصوصية، البلاغات، تعطيل العميل، وسائل الدفع. قواعد حدود الأيام للمهام تُختبر بساعة مزيفة في `tests/task-rules.test.mjs`.
