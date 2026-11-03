# سجل تقدم ربط AMAN.C بـ Supabase

**آخر تحديث:** 2026-11-03. **الفرع:** `feature/aman-c-ui-reference-v5`. **مشروع Supabase:** `hzurzkjtjvkfxmwzskks`.

> الحالة الصادقة: الفحص اكتمل، والتنفيذ لم يبدأ إلا بملف الإعدادات. **لا يوجد محوّل Supabase بعد، ولم يُجرَ أي اختبار ربط.** لم تُعدَّل صفحتا العميل والإدارة ولا أي ملف قائم.

## 1. ما أُنجز

1. **فحص المستودع** (47 ملفًا): `services/runtime.js` و`services/CONTRACTS.md` و`client/` و`admin/` (5 ملفات مراحل) و`simulation/` و`tests/` و`scripts/` والترحيل الوحيد `supabase/migrations/20261101000100_initial_schema.sql`.
2. **فحص قاعدة البيانات الفعلية**:
   - 22 جدولًا، RLS مفعّل على كلها. الصفوف الموجودة: `rejection_reasons` (3) و`app_content` (4) فقط.
   - 46 دالة RPC في `public`، كلها `SECURITY DEFINER` وتأخذ معاملًا واحدًا `p jsonb` وتُرجع `{success, ...}` أو `{success:false, code, message}`، أي أنها متوافقة مع شكل العقود.
   - 11 دالة `client_*` و35 دالة `admin_*`، وكلها مطابقة للعقود (انظر الجدول في القسم 3).
   - مستخدمو Auth: 0. المديرون: 0.
3. **فحص الأمان** (قراءة فقط):
   - `EXECUTE` على الدوال ممنوح لـ `authenticated` فقط. لا `anon` ولا `PUBLIC`.
   - كل دوال `admin_*` تستدعي `aman.adm()` وهي تتحقق من `profiles.role='admin'` و`status='active'` على الخادم.
   - كل دوال `client_*` تستدعي `aman.cust()` (دور `customer` وحالة `active`) وتقيّد الصفوف بمعرّف المستخدم من `auth.uid()`.
   - `authenticated` يملك `SELECT` فقط على `profiles` (صفه هو)، بلا `UPDATE` ولا `INSERT`، فلا تصعيد صلاحيات ممكن من الواجهة.
   - مخطط `aman` لا يملك `anon` ولا `authenticated` صلاحية `USAGE` عليه.
   - الدور يُعيَّن `customer` من المشغّل `handle_new_user` فقط، ولا يقرأ بيانات التسجيل الوصفية.
   - فهرس فريد يمنع وجود أكثر من مدير واحد.
   - تحذيرات المستشار الأمني: `rls_enabled_no_policy` (21 جدولًا) مقصودة، فالجداول مغلقة والوصول عبر RPC فقط. `authenticated_security_definer_function_executable` (46) متوقعة، فالتحقق من الدور داخل كل دالة. `extension_in_public` للامتداد `btree_gist` تحذير بسيط وغير عاجل ولم يُعالَج.
   - `rls_auto_enable` لم يُمسّ.
4. **ملف جديد:** `services/supabase-config.js` يضع على `window.AMAN_SUPABASE_CONFIG` عنوان المشروع ومفتاح النشر العام `sb_publishable_...`. لا يحتوي أي سر.

## 2. قيود البيئة التي اكتُشفت (تؤثر على خطة الاستئناف)

- الشبكة من بيئة العمل محصورة بقائمة سماح: **لا وصول إلى Supabase ولا npm ولا CDN**. لذلك لا يمكن تضمين `supabase-js` محليًا ولا اختبار الاتصال الحي من الصدفة.
- الاختبار ممكن عبر أداة Supabase (`execute_sql`)، وذلك بمحاكاة المستخدمين داخل كتلة `DO` تنتهي بـ `RAISE EXCEPTION` حتى يُلغى كل ما أُنشئ مؤقتًا (بلا أثر دائم).
- الاختبار الآخر الممكن هو اختبار المحوّل في `vm` بعميل Supabase وهمي (الأسلوب نفسه في `tests/contract.test.mjs`).
- حزمة اختبارات المتصفح (`node --test tests/*.test.js ...`) تعلّقت أكثر من 5 دقائق في الجلسة الأولى (على الأرجح Playwright). شغّل الاختبارات غير المتصفحية كلًّا على حدة بمهلة، مثل `node --test tests/contract.test.mjs`.

## 3. خريطة الربط المعتمدة (عقد ← دالة)

**العميل** (`window.AMANClientServices`):

| العملية | التنفيذ |
|---|---|
| `getSession` | جلسة محلية، ثم `client_get_session`. إن رجع `user:null` (معطّل أو مدير) فتسجيل خروج محلي |
| `signIn` | `auth.signInWithPassword` ثم `client_get_session` للتحقق من الدور والحالة. الرسالة موحّدة `invalid_credentials` |
| `signUp` | `auth.signUp({email,password})` بلا بيانات وصفية. لا بريد مؤكَّد ← `email_confirmation_required` (فشل صريح). `identities` فارغة ← `email_taken` |
| `signOut` | `auth.signOut({scope:"local"})`، ويرجع `auth_required` إن لا جلسة |
| `changePassword` | إعادة مصادقة بكلمة المرور الحالية (`wrong_password`) ثم `auth.updateUser({password})` |
| `lookupNumber` | `client_lookup_number` |
| `listMyNumbers` | `client_list_my_numbers` |
| `listMyOperations` | `client_list_my_operations` |
| `getProtectionCatalog` | `client_get_catalog` |
| `submitProtectionRequest` | `client_submit_request` |
| `updateProfile` | `client_update_profile` |
| `getNotifications` | `client_get_notifications` |
| `markNotificationRead` | `client_mark_notification_read` |
| `listNumberAlerts` | `client_list_number_alerts` |
| `submitReport` | `client_submit_report` |

**الإدارة** (`window.AMANAdminServices`)، والاستدعاء دائمًا `rpc(fn, { p: payload })`:

`getCurrentAdmin`←`admin_get_current` · `getDashboardSummary`←`admin_dashboard` · `listRequests`←`admin_list_requests` · `getRequestDetails`←`admin_get_request` · `getApprovalPreview`←`admin_approval_preview` · `getRejectReasons`←`admin_get_reject_reasons` · `approveRequest`←`admin_approve_request` · `rejectRequest`←`admin_reject_request` · `listNumbers`←`admin_list_numbers` · `getNumberDetails`←`admin_get_number` · `listCustomers`←`admin_list_customers` · `getCustomerDetails`←`admin_get_customer` · `updateCustomerStatus`←`admin_update_customer_status` · `listTasks`←`admin_list_tasks` · `getTaskDetails`←`admin_get_task` · `executeTask`←`admin_execute_task` · `previewTaskReschedule`←`admin_preview_reschedule` · `rescheduleTask`←`admin_reschedule_task` · `getRevenueReport`←`admin_revenue` · `listComplaints`←`admin_list_complaints` · `decideComplaint`←`admin_decide_complaint` · `listAdminNotifications`←`admin_list_notifications` · `createAdminNotification`←`admin_create_notification` · `listAdminAlerts`←`admin_list_alerts` · `createAdminAlert`←`admin_create_alert` · `listCompanies`←`admin_list_companies` · `previewCompanySettings`←`admin_preview_company` · `saveCompanySettings`←`admin_save_company` · `listPackages`←`admin_list_packages` · `savePackage`←`admin_save_package` · `listPaymentMethods`←`admin_list_payment_methods` · `savePaymentMethod`←`admin_save_payment_method` · `getAppContent`←`admin_get_content` · `saveAppContent`←`admin_save_content` · `listAuditLog`←`admin_list_audit`.

`signInAdmin` و`signOutAdmin` عبر Auth؛ وبعد الدخول يُستدعى `admin_get_current`، فإن لم يكن المدير فعليًا يُنهى الدخول فورًا ويُرجَع `invalid_credentials`.

## 4. قرارات التصميم المتفق عليها مع نفسي (تُراجَع عند الاستئناف)

1. **عميلان منفصلان** لـ Supabase بمفتاحَي تخزين مختلفين (`aman_c_client_auth` و`aman_c_admin_auth`)، لأن صفحتي العميل والإدارة على النطاق نفسه ولا يجوز أن تطغى جلسة على الأخرى.
2. **جلسة المدير في `sessionStorage`** (تنتهي بإغلاق التبويب) وجلسة العميل في `localStorage`. كلاهما يعيش بعد إعادة تحميل الصفحة.
3. **المكتبة من CDN بإصدار مثبّت** `@supabase/supabase-js@2.104.0` (`dist/umd/supabase.js` عبر jsdelivr) بلا SRI، لأن حساب الـ hash غير ممكن دون شبكة. التوصية لاحقًا: تضمين الملف في المستودع أو إضافة SRI. إن فشل التحميل يسجَّل المحوّل ويُرجع `service_unreachable` برسالة عربية واضحة.
4. **لا إعادة محاولة تلقائية للعمليات المغيِّرة** عند انقطاع الشبكة (خشية التكرار). تُعرض رسالة «لم يتم تأكيد نتيجة العملية». الاستثناء الوحيد محاولة واحدة بعد تجديد JWT منتهٍ.
5. **مهلة 20 ثانية** لكل استدعاء RPC عبر `AbortController`.
6. **لا استدعاء دون جلسة:** يُرجَع `auth_required` مباشرة (لأن `anon` لا يملك `EXECUTE`).
7. **ترجمة `subscription`**: قائمة نوع العملية في الإدارة تُرسل `subscription` بينما القاعدة تستخدم `activation`، فيُحوَّل في المحوّل لا في الواجهة.
8. **التسجيل:** يتخطى المحوّل التسجيل إن وُجد العلم `window.__AMAN_SIMULATION__` (حتى لا يتعارض مع المحاكاة في المعاينة التجريبية المنشورة).
9. الرسائل الإنجليزية الخام من المكتبة لا تُعرض للمستخدم؛ تُترجم إلى رسائل عربية ورموز العقد.

## 5. نقطة الاستئناف — المطلوب بالترتيب

1. **كتابة `services/supabase-adapter.js`** وفق القسمين 3 و4. يسجّل نفسه عبر `AMANServices.register({name:"supabase", client, admin})`، ويجب أن يعطي `AMANServices.status().missing` قوائم فارغة (15 عملية عميل و37 إدارة).
2. **تعديل `client/index.html` و`admin/index.html`** بإضافة، بعد وسم `runtime.js` وقبل `app.js`، الوسوم التالية بالترتيب: سكربت المكتبة من CDN، ثم `supabase-config.js`، ثم `supabase-adapter.js` (كلها `defer`). لا تذكر كلمة simulation في الصفحتين (الاختبارات تمنعها).
3. **قيود الاختبارات القائمة التي يجب مراعاتها:**
   - `tests/isolation.test.js` يمنع `service_role` و`supabase.co` وروابط خارجية في: `services/runtime.js` و`simulation/simulation-adapter.js` و`client/app.js` و`admin/app.js` فقط. الملفات الجديدة خارج هذه القائمة.
   - `tests/browser.test.js` السطر 39 ("بلا محاكاة ... الخدمة غير مهيأة") سينكسر، لأن المحوّل سيسجّل نفسه الآن. عدّله ليتحقق أن الدخول يفشل برسالة اتصال دون نجاح.
   - `scripts/validate.mjs` يفحص صياغة قائمة ملفات ثابتة: أضف إليها `services/supabase-adapter.js` و`services/supabase-config.js`.
4. **اختبار المحوّل** بملف جديد `tests/supabase-adapter.test.mjs` (عميل Supabase وهمي داخل `vm`): التسجيل، اكتمال العمليات، أسماء الدوال والمعامل `{p}`، غياب الجلسة، الشبكة المقطوعة، JWT المنتهي، الاستجابة غير المتوقعة، رفض غير المدير، البريد المكرر، والقاعدة الفارغة. أضف فحصًا يمنع ظهور `service_role` أو أي مفتاح سري في الملفات.
5. **اختبار قاعدة البيانات** عبر `execute_sql` (كتلة `DO` تنتهي بـ `RAISE EXCEPTION` لإلغاء كل شيء): رفض `anon`، رفض العميل لدوال الإدارة، عزل العملاء (عميل B لا يرى أرقام A)، سلوك القاعدة الفارغة، ثم تدفق طلب وهمي مؤقت (إرسال ← معاينة ← رفض/اعتماد) يُلغى بالكامل. لا يُحفظ أي شيء.
6. **حدّث `docs/SUPABASE_SETUP_AR.md` و`services/CONTRACTS.md`** (الجملتان القديمتان "لم يُختر مزود" و"لا توجد بعد دوال اعتماد" لم تعودا صحيحتين).
7. **التسليم:** commit وpush إلى الفرع نفسه فقط، ثم تقرير ختامي.

## 6. خطوات مطلوبة من صاحب المشروع (لا يمكن تنفيذها بدوني)

**إنشاء المدير الأول** (لا تُرسل كلمة المرور في المحادثة):

1. لوحة Supabase ← **Authentication** ← **Users** ← **Add user** ← **Create new user**.
2. أدخل بريدك وكلمة مرور قوية تختارها أنت، وفعّل **Auto Confirm User**، ثم **Create user**.
3. **SQL Editor** ← نفّذ التالي مع بريدك الحقيقي:

```sql
update public.profiles set role = 'admin' where email = 'ضع-بريدك-هنا';
select id, email, role, status from public.profiles where role = 'admin';
```

يجب أن يظهر صف واحد فقط. الفهرس الفريد يمنع مديرًا ثانيًا.

**البيانات التشغيلية** (لا أخترعها): الشركات وبادئاتها وأطوال الأرقام، الباقات وأسعارها ومددها، وسائل الدفع وتعليماتها، إعدادات المهام والتنشيط لكل شركة. تُدخَل من لوحة الإدارة بعد دخولك مديرًا.

**قرارات لازمة:** (أ) هل يبقى تأكيد البريد مفعّلًا في Supabase Auth؟ (يؤثر على سلوك إنشاء الحساب.) (ب) متى تسمح بدمج الفرع ونشر الصفحات؟ روابط GitHub Pages الحالية تخدم `main` فقط (سير العمل ينشر منه)، وبدون دمج لن ترى الربط عليها.

## 7. ما لم يُفعل ولن يُفعل دون إذن

لا دمج في `main`، لا تغيير في إعدادات النشر، لا بيانات تجريبية دائمة، لا اعتماد أو سداد حقيقي، لا حذف لأي وظيفة أو شاشة، لا تغيير في التصميم.
