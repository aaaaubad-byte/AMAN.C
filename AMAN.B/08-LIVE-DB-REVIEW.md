# 08 — فحص قاعدة Supabase الحية (قراءة فقط)

التاريخ: 2026-11-05 · الفرع: `rebuild/aman-d`
الحالة: **اكتمل الفحص. لم يُنفَّذ أي أمر يغيّر بيانات أو بنية أو صلاحيات. لم تُطبَّق ترحيلات. لم يُنشأ فرع ولا مشروع Supabase.**

## 1. المصدر والأسلوب
استعلامات SELECT على كتالوج Postgres وجدول `supabase_migrations.schema_migrations`، إضافة إلى استعلام تكلفة ومستشار الأمان (قراءة فقط). المرجع هو القاعدة الحية كما هي في 2026-11-05.

## 2. الترحيلات المطبَّقة (6 مقابل 1 في المستودع)
| # | الإصدار | الاسم | الحجم (حرف) | المحتوى |
|---|---|---|---|---|
| 1 | 20261103015328 | initial_schema | 14,555 | الجداول الأساسية والأنواع وRLS ومشغّل `handle_new_user` والفهارس |
| 2 | 20261103015752 | operational_schema_and_helpers | 16,438 | مخطط `aman` ودوال المساعدة، جداول تشغيلية، بذور `app_content` و`rejection_reasons` |
| 3 | 20261103015845 | client_rpcs | 12,304 | 11 دالة عميل |
| 4 | 20261103020103 | admin_rpcs_part1 | 29,088 | دوال الإدارة (1) |
| 5 | 20261103020323 | admin_rpcs_part2 | 23,677 | دوال الإدارة (2) |
| 6 | 20261103020953 | revoke_public_execution_rls_auto_enable | 85 | سحب EXECUTE العام عن `rls_auto_enable` |

كل ترحيل مخزَّن كعبارة واحدة. في المستودع ترحيل واحد `20261101000100_initial_schema.sql`. استخراج النصوص إلى ملفات يجب أن يتم آليًا (نسخ حرفي من `statements`) لا بإعادة كتابة يدوية؛ لم يُنفَّذ بعد.

## 3. جرد البنية (`public`)
- **22 جدولًا**، كلها RLS مفعّل: profiles, companies, company_prefixes, numbers, number_links, protection_packages, payment_methods, rejection_reasons, protections, operation_requests, protection_events, company_task_settings, reactivation_settings, tasks, reports, report_actions, notifications, number_alerts, app_content, audit_log, notification_broadcasts, profile_status_history.
- **Enums**: account_role، account_status، message_source، operation_type، protection_event_type، report_decision، report_reason_code، request_status، task_status.
- **قيود/فهارس مهمة**: `profiles_single_admin_idx` (مدير واحد)، `tasks_one_pending_per_number` (مهمة معلّقة واحدة لكل رقم)، `(customer_id, idempotency_key)` على الطلبات، `reactivation_settings_scope_idx` (صف عام واحد على الأكثر)، `number_links (number_id, customer_id)`، `tasks (protection_id, seq)`.
- لا قيود EXCLUDE ولا فهارس GiST.
- **مشغّلات**: `on_auth_user_created` على `auth.users` فقط (ينشئ `profiles` بدور customer). لا مشغّلات `updated_at` (تُحدَّث يدويًا داخل الدوال). حدث DDL: `ensure_rls`.
- **الإضافات**: btree_gist (في `public`)، pgcrypto، uuid-ossp، pg_stat_statements، supabase_vault.

## 4. الدوال
**4.1 دوال API في `public` (46)**، كلها SECURITY DEFINER و`search_path = public, aman, pg_temp`، EXECUTE لـ `authenticated` فقط:
- عميل (11): client_get_catalog, get_notifications, get_session, list_my_numbers, list_my_operations, list_number_alerts, lookup_number, mark_notification_read, submit_report, submit_request, update_profile.
- إدارة (35): approval_preview, approve_request, create_alert, create_notification, dashboard, decide_complaint, execute_task, get_content, get_current, get_customer, get_number, get_reject_reasons, get_request, get_task, list_alerts, list_audit, list_companies, list_complaints, list_customers, list_notifications, list_numbers, list_packages, list_payment_methods, list_requests, list_tasks, preview_company, preview_reschedule, reject_request, reschedule_task, revenue, save_company, save_content, save_package, save_payment_method, update_customer_status.
- كلها `p jsonb → jsonb` بصيغة `{success:true,...}` أو `{success:false, code, message}`.

**4.2 مخطط `aman` (39 دالة مساعدة)**: ليس لأدوار API عليه USAGE فلا تُستدعى من العميل. الحارسان `aman.adm()` و`aman.cust()`.

**4.3 تصحيح**: «الدوال المساعدة الأربعون» = 39 دالة في `aman`. مئات الدوال `gbt_*` و`*_dist` في `public` من إضافة `btree_gist` وليست كود تطبيق ولا تدخل ترحيلات AMAN.D.

## 5. الصلاحيات
- سياسة RLS وحيدة: `profiles_select_self`. 21 جدولًا بلا سياسة (INFO في المستشار: مقصود، الوصول عبر الدوال).
- `authenticated`: SELECT على `profiles` فقط. `anon`: لا منح جداول ولا EXECUTE. `service_role`: REFERENCES/TRIGGER/TRUNCATE فقط (لا SELECT/INSERT) كما تظهر القراءة — يؤثر على سكربتات البذور والاختبار.
- مستشار الأمان: (أ) 46 تنبيه `authenticated_security_definer_function_executable` — متوقع بالتصميم، الحماية داخل الدوال؛ (ب) `extension_in_public` لـ btree_gist؛ (ج) `auth_leaked_password_protection` معطّل (إعداد Auth).
- أول مدير: `aman.promote_admin(email)` يدويًا عبر SQL، ويعمل فقط إن لم يوجد مدير.

## 6. السلوك الفعلي الذي يُوثَّق كما هو (بلا اختراع قرارات)
1. المنطقة الزمنية ثابتة `Asia/Aden` في `day_start/day_end`.
2. حالات الرقم (`not_subscribed`/`protected`/`inactive`/`confiscated`) تُشتق من `now()` ونهاية الحماية الفعلية (`least(ends_at, terminated_at)`) ومهلة المصادرة.
3. مهلة المصادرة: نهاية يوم استحقاق المهمة المعلّقة، وإلا الموعد التالي المحسوب، وإلا نهاية الحماية + أيام مهلة التنشيط إن كان مفعّلًا.
4. الاعتماد: اشتراك ⇒ يغلق المهام المعلّقة ويعيّن المالك و`plan_anchor_at` وينشئ حماية؛ تمديد ⇒ يزيد `ends_at` و`total_days`؛ تنشيط ⇒ حماية جديدة؛ ثم `plan_next` وإشعار وتدقيق.
5. قرار البلاغ: الواجهة `terminate_protection` والمخزَّن `protection_terminated` (تحويل في الدالة).
6. `admin_preview_reschedule.affected_count` يحسب الدورات حتى نهاية الحماية، و`admin_reschedule_task` يعدّل `due_at` للمهمة الواحدة فقط.
7. حفظ الشركة: تغيير `interval_days` يزيح `due_at` لكل المهام المعلّقة للشركة بالفرق.
8. `cfg()` يدعم صف تنشيط عامًا (`company_id is null`) احتياطيًا، بينما `company_json` والحفظ لكل شركة؛ الحي بلا صف عام.
9. `client_submit_request` ينشئ صف `numbers` بلا مالك عند أول طلب على رقم غير موجود، والإدارة لا تعرض إلا الأرقام ذات المالك.
10. `admin_list_audit` بحد أقصى 1000. `admin_list_alerts` يُرجع `source='manual'` ثابتًا.

## 7. البيانات الحية: ما يدخل الترحيلات
| الفئة | القرار المقترح |
|---|---|
| مرجعية بذرية: `app_content` (terms/privacy/contact/help)، `rejection_reasons` (3) | تدخل كبذور (موجودة في الترحيل 2 الحي) |
| تشغيلية: الشركات، البادئات، الباقات، وسائل الدفع (برقم الحساب)، إعدادات المهام والتنشيط، الأرقام، الطلبات، الحمايات، المهام، البلاغات، الإشعارات، التدقيق، الملفات الشخصية | **لا تدخل** |

القيمة الحية لـ«إنشاء أول مهمة» للشركة الوحيدة `true` (تختلف عن القرار المفتوح القديم «لا»)؛ تُسجَّل إعدادًا تشغيليًا لا قرارًا.

## 8. الفروق مع المستودع والملفات المتأثرة في AMAN.D
| الفرق | الملفات المتأثرة (مقترح) |
|---|---|
| 6 ترحيلات حية مقابل 1 | `supabase/migrations/*` (إعادة تشكيل مرتّبة بلا تعريفات btree_gist) |
| كل المنطق في القاعدة ومخطط `aman` | `supabase/migrations/*`, `docs/DATABASE.md`, `docs/BUSINESS-RULES.md` |
| 46 RPC بصيغة `{success,code,message}` | `shared/supabase-adapter.js`, `docs/SERVICES-CONTRACT.md` |
| لا وصول مباشر للجداول | المحوّل لا يستعمل `.from()` إلا لـ`profiles` (قراءة) |
| حالات من `now()` وتوقيت `Asia/Aden` | اختبارات SQL (تحتاج التحكم بالزمن) |
| إزالة المحاكاة | `tests/*` تُعاد كتابتها على بيئة تطويرية |

## 9. بيئة اختبار المهام: المتطلبات والتكلفة
لم يُنشأ أي مورد. تقدير `get_cost` للمنظمة الوحيدة:
| الخيار | التكلفة المقتبسة | ملاحظات |
|---|---|---|
| فرع Supabase | **0.01344 دولار/ساعة** (نحو 9.7 دولار/شهر لو بقي دائمًا) | يطبّق الترحيلات على قاعدة جديدة بلا بيانات الإنتاج؛ يحتاج موافقتك على التكلفة؛ يُحذف بعد الاختبار |
| مشروع تطوير مستقل | **0 دولار/شهر** (مقتبس) | عزل كامل؛ قد تنطبق حدود الباقة المجانية |
| Supabase محلي (CLI + Docker) | 0 | يلزم جهازك |

المتطلبات: تطبيق الترحيلات الستة، مستخدمو اختبار (عميل + مدير) عبر Auth، تحميل البيانات باتصال مميّز (لأن `service_role` بلا SELECT/INSERT)، وإدخال طوابع زمنية ماضية للتحكم بالزمن. إلغاء المعاملة لا يكفي وحده (`auth.users` والتسلسلات والسجلات خارجها).

## 10. مكتبة supabase-js
تبقى `2.104.0` على CDN بلا SRI مؤقتًا. خيارات الحسم قبل `shared/config.js`: (1) إبقاء الوضع الحالي؛ (2) نسخة محلية `vendor/supabase-js-2.104.0.min.js` مع PWA (تتطلب الملف نفسه منك)؛ (3) CDN مع `integrity="sha384-..."` و`crossorigin="anonymous"` بتجزئة SHA-384 (base64) لبايتات الملف المخدوم بالضبط. لا تُولَّد قيمة SRI من الذاكرة.

## 11. القيود
- لم أقارن الترحيل الموجود في AMAN.C حرفيًا بالحي، ولا استدعاءات الخدمات والواجهات للـ RPC (تُنجز في المرحلة 4 لكل ملف).
- لم أستخرج نصوص الترحيلات إلى ملفات.
- لم تُفحص Edge Functions ولا التخزين ولا إعدادات Auth (سوى ما ظهر في المستشار) ولا GitHub Actions.
