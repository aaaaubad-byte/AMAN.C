# قاعدة البيانات

## الاتصال

AMAN.D يستخدم مشروع Supabase الحالي الخاص بـ AMAN.C نفسه؛ لا ينشئ مشروعًا أو قاعدة جديدة. تقرير الجاهزية المسجل في AMAN.B يحدد المشروع `hzurzkjtjvkfxmwzskks`، وحالته ACTIVE_HEALTHY، ومحرك PostgreSQL 17.11.0.016 في منطقة ap-southeast-1.

## الجداول

يوثق جرد قاعدة البيانات 22 جدولًا في مخطط public:

`profiles`, `companies`, `company_prefixes`, `numbers`, `number_links`, `protection_packages`, `payment_methods`, `rejection_reasons`, `protections`, `operation_requests`, `protection_events`, `company_task_settings`, `reactivation_settings`, `tasks`, `reports`, `report_actions`, `notifications`, `number_alerts`, `app_content`, `audit_log`, `notification_broadcasts`, `profile_status_history`.

تتضمن العلاقات ربط الأرقام بالعملاء، وربط طلبات العمليات بفترات الحماية والباقات ووسائل الدفع، وربط المهام بفترات الحماية والأرقام والشركات، وربط البلاغات بقرارات المعالجة.

## الأمان والوصول

- RLS مفعّل على الجداول الـ22.
- يسجل تقرير التدقيق سياسة مباشرة واحدة على profiles لقراءة الملف الشخصي الذاتي؛ لا توجد سياسات مباشرة على الجداول الـ21 الأخرى.
- الوصول التشغيلي للتطبيق يمر عبر RPC المراجعة، وليس عبر استعلامات الجداول من الواجهات.
- وثّق التقرير 48 دالة SECURITY DEFINER في public، و46 RPC خاصة بالتطبيق، بعقد وسيط `p jsonb` ونتيجة JSON موحدة.
- لا توجد Edge Functions أو Storage buckets في جرد التقرير.

## ملفات الترحيل

تحتوي `supabase/migrations/` على ستة ملفات منسوخة حرفيًا من `supabase_migrations.schema_migrations.statements[1]`. أُثبتت أطوال النصوص وبصمات SHA-256 في سجل التقدم AMAN.B/05، ومصدرها تقرير AMAN.B/13.

هذه الملفات تمثل تاريخ المخطط الموجود، وليست خطة لتغيير قاعدة الإنتاج. **لا تطبقها على قاعدة الإنتاج ولا تعِد ترتيبها أو دمجها.** أي اختبار SQL لاحق يحتاج بيئة تطوير مستقلة وموافقة منفصلة وفق Q3.

## التغييرات

لم تُنفذ DDL أو DML في قاعدة الإنتاج أثناء كتابة AMAN.D. لم تُعدّل إعدادات Auth، ولم يُنشأ فرع Supabase أو مشروع جديد. إذا تطلبت مرحلة لاحقة تغيير المخطط، يجب أن تكون مهمة منفصلة بموافقة صريحة وبيئة مناسبة.
