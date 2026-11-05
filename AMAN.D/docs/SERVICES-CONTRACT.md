# عقود الخدمات

## العقد العام

تُتاح واجهتان موحدتان:

- `window.AMANClientServices`
- `window.AMANAdminServices`

تُعرّف أسماء الدوال في `shared/runtime.js`، وينفذها المحوّل المسجل عبر `window.AMANServices.register()` في `shared/supabase-adapter.js`.

كل عملية تعيد أحد الشكلين:

```js
{ success: true, ...data }
{ success: false, code: "error_code", message: "رسالة عربية" }
```

لا تُعامل أي نتيجة غير مؤكدة أو غير مكتملة كنجاح. إذا لم يسجل محوّل، تعيد الطبقة `service_not_configured` دون بيانات وهمية.

## عقود العميل

| الدالة | الاستخدام |
|---|---|
| getSession | استعادة جلسة العميل والتحقق منها |
| signIn | تسجيل الدخول |
| signUp | إنشاء حساب |
| signOut | إنهاء الجلسة |
| lookupNumber | الاستعلام عن رقم |
| listMyNumbers | قائمة أرقام العميل |
| listMyOperations | سجل العمليات |
| getProtectionCatalog | كتالوج الحماية |
| submitProtectionRequest | إرسال طلب عملية |
| updateProfile | تحديث بيانات الحساب |
| changePassword | تغيير كلمة المرور |
| getNotifications | قائمة الإشعارات |
| markNotificationRead | تحديد الإشعار مقروءًا |
| listNumberAlerts | تنبيهات الأرقام |
| submitReport | إرسال بلاغ |

## عقود الإدارة

| الدالة | الاستخدام |
|---|---|
| getCurrentAdmin | التحقق من المدير الحالي |
| signInAdmin / signOutAdmin | دخول الإدارة وخروجها |
| getDashboardSummary | ملخص لوحة الإدارة |
| listRequests / getRequestDetails | قائمة الطلبات وتفاصيلها |
| getApprovalPreview / approveRequest | معاينة أثر الاعتماد ثم الاعتماد |
| getRejectReasons / rejectRequest | أسباب الرفض وتسجيل الرفض |
| listNumbers / getNumberDetails | قائمة الأرقام وتفاصيلها |
| listCustomers / getCustomerDetails | قائمة العملاء وتفاصيل الحساب |
| updateCustomerStatus | تعطيل حساب أو إعادة تفعيله |
| listTasks / getTaskDetails | قائمة المهام وتفاصيلها |
| executeTask | تنفيذ مهمة سداد |
| previewTaskReschedule / rescheduleTask | معاينة الجدولة وحفظها |
| getRevenueReport | تقرير الإيرادات والعمليات المعتمدة |
| listComplaints / decideComplaint | البلاغات وقرارات معالجتها |
| listAdminNotifications / createAdminNotification | إشعارات الإدارة |
| listAdminAlerts / createAdminAlert | تنبيهات الأرقام |
| listCompanies / previewCompanySettings / saveCompanySettings | الشركات ومعاينة إعداداتها وحفظها |
| listPackages / savePackage | باقات الحماية |
| listPaymentMethods / savePaymentMethod | وسائل الدفع |
| getAppContent / saveAppContent | المحتوى الثابت |
| listAuditLog | سجل التدقيق |

## عقد RPC

- يرسل المحوّل وسيط JSON باسم `p`.
- يعيد الخادم كائن JSON يحتوي `success`، وقد يحتوي `code` و`message`.
- تحويل التوافق `subscription → activation` يطبق على طلبات الواجهة قبل RPC.
- إذا أعادت قاعدة البيانات `items: null` للمحتوى، يحولها المحوّل إلى كائن فارغ `items: {}` حتى يبقى عقد الواجهة ثابتًا.
- مهلة RPC هي 20 ثانية.
- محاولة تجديد JWT واحدة مسموحة عند رفض رمز منتهٍ؛ لا توجد إعادة محاولة تلقائية للعمليات المغيّرة بعد انقطاع الشبكة.

## مصدر الحقيقة

تعريف العقود في `shared/runtime.js`، وربطها بأسماء RPC في `shared/supabase-adapter.js`. لا تضف اسمًا إلى الواجهة دون تنفيذه في المحوّل وقاعدة البيانات أو توثيق سبب تأجيله.
