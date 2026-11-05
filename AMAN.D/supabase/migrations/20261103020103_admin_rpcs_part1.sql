create function aman.resched_target(p_task uuid, p_due text) returns jsonb language plpgsql stable as $$
declare t public.tasks; nd timestamptz;
begin
  select * into t from public.tasks where id = p_task and status <> 'executed' and closed_at is null;
  begin nd := p_due::timestamptz; exception when others then nd := null; end;
  if t.id is null or nd is null then return jsonb_build_object('error', aman.err('invalid_request', 'تعذرت إعادة الجدولة.')); end if;
  if aman.n_status(t.number_id) <> 'protected' then
    return jsonb_build_object('error', aman.err('task_not_reschedulable', 'إعادة الجدولة متاحة لمهام الأرقام المحمية فقط.'));
  end if;
  if aman.day_start(nd) < aman.day_start(now()) then
    return jsonb_build_object('error', aman.err('invalid_date', 'لا يمكن جدولة المهمة في تاريخ سابق لليوم.'));
  end if;
  return jsonb_build_object('number_id', t.number_id, 'next_due', aman.day_start(nd));
end $$;
alter function aman.resched_target(uuid, text) set search_path = public, aman, pg_temp;

create function public.admin_get_current(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); u public.profiles;
begin
  if a is null then return aman.auth_err(); end if;
  select * into u from public.profiles where id = a;
  return aman.ok(jsonb_build_object('admin', jsonb_build_object('id', u.id, 'full_name', coalesce(nullif(u.full_name, ''), 'مدير النظام'), 'email', u.email, 'is_admin', true)));
end $$;

create function public.admin_dashboard(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm();
begin
  if a is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('summary', jsonb_build_object(
    'pending_requests', (select count(*) from public.operation_requests where status = 'pending'),
    'protected_numbers', (select count(*) from public.numbers n where n.owner_id is not null and aman.n_status(n.id) = 'protected'),
    'open_reports', (select count(*) from public.reports r where not exists (select 1 from public.report_actions x where x.report_id = r.id)),
    'due_tasks', (select count(*) from public.tasks t where t.status <> 'executed' and t.closed_at is null
                    and aman.task_status(t) = 'due' and aman.n_status(t.number_id) = 'protected'),
    'customers', (select count(*) from public.profiles u where u.role = 'customer'
                    and exists (select 1 from public.operation_requests r where r.customer_id = u.id and r.status = 'approved')),
    'approved_revenue_yer', (select coalesce(sum((package_snapshot->>'price_yer')::bigint), 0) from public.operation_requests where status = 'approved'))));
end $$;

create function public.admin_list_requests(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); st text := nullif(nullif(p->>'status', ''), 'all'); op text := nullif(nullif(p->>'operation_type', ''), 'all');
  comp uuid := aman.uuid_or_null(p->>'company_id'); q text := lower(nullif(btrim(coalesce(p->>'search', '')), ''));
begin
  if a is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object(
    'requests', coalesce((
      select jsonb_agg(aman.req_json(r.id) order by case when st = 'pending' then extract(epoch from r.submitted_at) else -extract(epoch from r.submitted_at) end)
      from public.operation_requests r
      join public.numbers n on n.id = r.number_id
      join public.profiles u on u.id = r.customer_id
      where (st is null or r.status::text = st) and (op is null or r.operation_type::text = op)
        and (nullif(p->>'company_id', 'all') is null or r.company_id = comp)
        and (q is null or strpos(n.number, q) > 0 or strpos(lower(aman.req_no(r.request_no)), q) > 0
             or strpos(lower(coalesce(nullif(u.full_name, ''), u.email, '')), q) > 0)), '[]'::jsonb),
    'companies', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name) from public.companies), '[]'::jsonb)));
end $$;

create function public.admin_get_request(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); r public.operation_requests; n public.numbers; u public.profiles; cur text; w jsonb := '[]'::jsonb; pr public.protections; v jsonb;
begin
  if a is null then return aman.auth_err(); end if;
  select * into r from public.operation_requests where id = aman.uuid_or_null(p->>'request_id');
  if r.id is null then return aman.err('not_found', 'الطلب غير موجود.'); end if;
  select * into n from public.numbers where id = r.number_id;
  select * into u from public.profiles where id = r.customer_id;
  cur := aman.n_status(n.id);
  pr := aman.cur_prot(n.id);
  if r.status = 'pending' and cur is distinct from coalesce(r.number_status_at_submit, cur) then w := w || to_jsonb('تغيّرت حالة الرقم منذ إرسال الطلب.'::text); end if;
  if exists (select 1 from public.operation_requests x where x.id <> r.id and x.number_id = r.number_id and x.status = 'pending') then
    w := w || to_jsonb('يوجد طلب آخر قيد المراجعة على هذا الرقم.'::text); end if;
  if r.payment_reference is not null and exists (select 1 from public.operation_requests x where x.id <> r.id and x.payment_reference = r.payment_reference) then
    w := w || to_jsonb('مرجع الدفع مكرر في طلب آخر.'::text); end if;
  v := aman.req_json(r.id) || jsonb_build_object(
    'customer_type', case when exists (select 1 from public.operation_requests x where x.customer_id = r.customer_id and x.status = 'approved') then 'customer' else 'user' end,
    'customer_status', u.status, 'number_status', aman.status_label(cur),
    'current_protection_starts_at', case when cur = 'protected' then pr.starts_at end,
    'current_protection_ends_at', case when cur = 'protected' then aman.eff_end(pr) end,
    'reactivation_deadline', case when r.operation_type = 'reactivation' then aman.react_deadline(n.id) end,
    'warnings', w,
    'approval_blocked_reason', case when r.status = 'pending' then aman.block_reason(r.id) end);
  return aman.ok(jsonb_build_object('request', v));
end $$;

create function public.admin_approval_preview(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); r public.operation_requests; b text; d int; pr public.protections; s timestamptz;
begin
  if a is null then return aman.auth_err(); end if;
  select * into r from public.operation_requests where id = aman.uuid_or_null(p->>'request_id') and status = 'pending';
  if r.id is null then return aman.err('not_pending', 'الطلب لم يعد قيد المراجعة.'); end if;
  b := aman.block_reason(r.id);
  if b is not null then return aman.err('approval_blocked', b); end if;
  d := (r.package_snapshot->>'days')::int;
  if r.operation_type = 'extension' then
    pr := aman.cur_prot(r.number_id);
    s := aman.eff_end(pr);
    return aman.ok(jsonb_build_object('preview', jsonb_build_object('starts_at', s, 'ends_at', s + aman.secs_days(d),
      'effect_description', 'تمديد نهاية الحماية الحالية بمدة الباقة؛ تبقى بداية الحماية كما هي.')));
  end if;
  return aman.ok(jsonb_build_object('preview', jsonb_build_object('starts_at', now(), 'ends_at', now() + aman.secs_days(d),
    'effect_description', case when r.operation_type = 'activation'
      then 'تبدأ الحماية لحظة الاعتماد، ويدخل الرقم قائمة العميل، وتنشأ مهام السداد وفق إعدادات الشركة.'
      else 'تبدأ فترة حماية جديدة لحظة الاعتماد، ويستكمل مخطط المهام القائم.' end)));
end $$;

create function public.admin_get_reject_reasons(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'label', label) order by sort_order) from public.rejection_reasons where active), '[]'::jsonb)));
end $$;

create function public.admin_approve_request(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); r public.operation_requests; n public.numbers; b text; d int; pn text; pid uuid; pr public.protections;
begin
  if a is null then return aman.auth_err(); end if;
  select * into r from public.operation_requests where id = aman.uuid_or_null(p->>'request_id') for update;
  if r.id is null or r.status <> 'pending' then return aman.err('not_pending', 'الطلب غير متاح للاعتماد.'); end if;
  select * into n from public.numbers where id = r.number_id for update;
  b := aman.block_reason(r.id);
  if b is not null then return aman.err('approval_blocked', b); end if;
  d := (r.package_snapshot->>'days')::int;
  pn := r.package_snapshot->>'name';
  if r.operation_type = 'activation' then
    update public.tasks set closed_at = now(), closed_by = a where number_id = n.id and status <> 'executed' and closed_at is null;
    update public.numbers set owner_id = r.customer_id, plan_anchor_at = now() where id = n.id;
    insert into public.protections(number_id, customer_id, starts_at, ends_at, package_name, total_days, source_request_id)
    values (n.id, r.customer_id, now(), now() + aman.secs_days(d), pn, d, r.id) returning id into pid;
    insert into public.number_links(number_id, customer_id) values (n.id, r.customer_id) on conflict do nothing;
    insert into public.protection_events(protection_id, event_type, request_id, added_days) values (pid, 'activation', r.id, d);
  elsif r.operation_type = 'extension' then
    pr := aman.cur_prot(n.id);
    update public.protections set ends_at = ends_at + aman.secs_days(d), total_days = total_days + d, package_name = pn where id = pr.id;
    pid := pr.id;
    insert into public.protection_events(protection_id, event_type, request_id, added_days) values (pid, 'extension', r.id, d);
  else
    insert into public.protections(number_id, customer_id, starts_at, ends_at, package_name, total_days, source_request_id)
    values (n.id, r.customer_id, now(), now() + aman.secs_days(d), pn, d, r.id) returning id into pid;
    insert into public.protection_events(protection_id, event_type, request_id, added_days) values (pid, 'reactivation', r.id, d);
  end if;
  perform aman.plan_next(n.id);
  update public.operation_requests set status = 'approved', reviewed_at = now(), reviewed_by = a, protection_id = pid where id = r.id;
  perform aman.notify(r.customer_id, 'تم اعتماد طلبك', 'اعتُمد طلب ' || aman.op_label(r.operation_type) || ' للرقم ' || n.number || '.', 'request_approved');
  perform aman.audit(a, 'request_approved', 'request', r.id::text, 'اعتماد طلب ' || aman.req_no(r.request_no));
  return aman.ok();
end $$;

create function public.admin_reject_request(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); r public.operation_requests; rr public.rejection_reasons; nt text := btrim(coalesce(p->>'explanation', '')); ph text;
begin
  if a is null then return aman.auth_err(); end if;
  select * into r from public.operation_requests where id = aman.uuid_or_null(p->>'request_id') for update;
  if r.id is null or r.status <> 'pending' then return aman.err('not_pending', 'الطلب غير متاح للرفض.'); end if;
  select * into rr from public.rejection_reasons where code = p->>'reason_code' and active;
  if rr.id is null then return aman.err('invalid_reason', 'اختر سبب الرفض من القائمة.'); end if;
  if char_length(nt) > 300 then return aman.err('explanation_too_long', 'التوضيح أطول من 300 حرف.'); end if;
  update public.operation_requests set status = 'rejected', reviewed_at = now(), reviewed_by = a, reject_reason_id = rr.id, reject_reason_note = nullif(nt, '') where id = r.id;
  select number into ph from public.numbers where id = r.number_id;
  perform aman.notify(r.customer_id, 'تم رفض طلبك', 'رُفض طلب ' || aman.op_label(r.operation_type) || ' للرقم ' || ph || '. السبب: ' || rr.label || case when nt <> '' then ' — ' || nt else '' end, 'request_rejected');
  perform aman.audit(a, 'request_rejected', 'request', r.id::text, 'رفض طلب ' || aman.req_no(r.request_no), rr.label);
  return aman.ok();
end $$;

create function public.admin_list_numbers(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); st text := nullif(nullif(p->>'status', ''), 'all'); q text := nullif(btrim(coalesce(p->>'search', '')), '');
begin
  if a is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('numbers', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'phone', x.number, 'company_name', x.cname,
        'protection_status', x.ps, 'protection_status_label', aman.status_label(x.s), 'customer_id', x.owner_id, 'customer_count', 1)
      order by x.created_at desc)
    from (select n.id, n.number, n.owner_id, n.created_at, co.name as cname, aman.n_status(n.id) as s,
                 case when aman.n_status(n.id) = 'confiscated' then 'expired_confiscated' else aman.n_status(n.id) end as ps
          from public.numbers n join public.companies co on co.id = n.company_id where n.owner_id is not null) x
    where (st is null or x.ps = st) and (q is null or strpos(x.number, q) > 0 or strpos(x.cname, q) > 0)), '[]'::jsonb)));
end $$;

create function public.admin_get_number(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); n public.numbers; s text; pr public.protections; o public.profiles; co text; v jsonb;
begin
  if a is null then return aman.auth_err(); end if;
  select * into n from public.numbers where id = aman.uuid_or_null(p->>'number_id');
  if n.id is null or n.owner_id is null then return aman.err('not_found', 'الرقم غير موجود.'); end if;
  select name into co from public.companies where id = n.company_id;
  select * into o from public.profiles where id = n.owner_id;
  s := aman.n_status(n.id);
  pr := aman.cur_prot(n.id);
  v := jsonb_build_object(
    'id', n.id, 'phone', n.number, 'company_name', co,
    'protection_status', case when s = 'confiscated' then 'expired_confiscated' else s end, 'protection_status_label', aman.status_label(s),
    'created_at', n.created_at, 'reactivation_deadline', case when s = 'inactive' then aman.react_deadline(n.id) end,
    'expected_confiscation_at', case when s in ('protected', 'inactive') then aman.conf_deadline(n.id) end,
    'current_protection', case when s = 'protected' then jsonb_build_object('starts_at', pr.starts_at, 'ends_at', aman.eff_end(pr), 'package_name', pr.package_name, 'total_days', pr.total_days) end,
    'protection_periods', coalesce((select jsonb_agg(jsonb_build_object('starts_at', x.starts_at, 'ends_at', aman.eff_end(x), 'package_name', x.package_name, 'total_days', x.total_days) order by x.starts_at desc)
        from public.protections x where x.number_id = n.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('label', case e.event_type when 'admin_terminated' then 'إنهاء إداري' when 'activation' then 'اشتراك' when 'extension' then 'تمديد الاشتراك' else 'تنشيط' end, 'summary', e.at) order by e.at desc)
        from public.protection_events e join public.protections x on x.id = e.protection_id where x.number_id = n.id), '[]'::jsonb),
    'customers', jsonb_build_array(jsonb_build_object('customer_name', coalesce(nullif(o.full_name, ''), o.email), 'customer_id', o.id, 'summary', 'مالك الحماية الحالي')),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('request_number', aman.req_no(r.request_no), 'status_label',
        case r.status when 'pending' then 'قيد المراجعة' when 'approved' then 'معتمد' else 'مرفوض' end) order by r.submitted_at desc)
        from public.operation_requests r where r.number_id = n.id), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('label', aman.report_label(r.reason_code), 'summary',
        case when exists (select 1 from public.report_actions x where x.report_id = r.id) then 'تمت المعالجة' else 'قيد المعالجة' end) order by r.created_at desc)
        from public.reports r where r.number_id = n.id), '[]'::jsonb),
    'alerts', coalesce((select jsonb_agg(jsonb_build_object('title', x.title, 'summary', x.created_at) order by x.created_at desc)
        from public.number_alerts x where x.number_id = n.id), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('label', 'مهمة سداد', 'summary',
        case aman.task_status(t) when 'planned' then 'مخططة' when 'due' then 'مستحقة' else 'منفذة' end || ' — ' || t.due_at) order by t.due_at desc)
        from public.tasks t where t.number_id = n.id and t.closed_at is null), '[]'::jsonb));
  return aman.ok(jsonb_build_object('number', v));
end $$;

create function public.admin_list_customers(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); ty text := nullif(nullif(p->>'type', ''), 'all'); st text := nullif(nullif(p->>'status', ''), 'all'); q text := lower(nullif(btrim(coalesce(p->>'search', '')), ''));
begin
  if a is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('customers', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'full_name', coalesce(x.full_name, ''), 'email', x.email, 'customer_type', x.ct,
        'status', x.status, 'phone', x.ph, 'created_at', x.created_at) order by x.created_at desc)
    from (select u.id, u.full_name, u.email, u.status, u.created_at,
                 case when exists (select 1 from public.operation_requests r where r.customer_id = u.id and r.status = 'approved') then 'customer' else 'user' end as ct,
                 (select n.number from public.numbers n where n.owner_id = u.id order by n.created_at limit 1) as ph,
                 (select string_agg(n.number, ' ') from public.numbers n where n.owner_id = u.id) as phones
          from public.profiles u where u.role = 'customer') x
    where (ty is null or x.ct = ty) and (st is null or x.status::text = st)
      and (q is null or strpos(lower(coalesce(x.full_name, '') || ' ' || coalesce(x.email, '') || ' ' || coalesce(x.phones, '')), q) > 0)), '[]'::jsonb)));
end $$;

create function public.admin_get_customer(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); u public.profiles;
begin
  if a is null then return aman.auth_err(); end if;
  select * into u from public.profiles where id = aman.uuid_or_null(p->>'customer_id') and role = 'customer';
  if u.id is null then return aman.err('not_found', 'العميل غير موجود.'); end if;
  return aman.ok(jsonb_build_object('customer', jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', coalesce(u.full_name, ''), 'status', u.status, 'created_at', u.created_at, 'is_admin', false,
    'customer_type', case when exists (select 1 from public.operation_requests r where r.customer_id = u.id and r.status = 'approved') then 'customer' else 'user' end,
    'disabled_reason', u.disabled_reason,
    'numbers', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'phone', n.number,
        'protection_status', case when aman.n_status(n.id) = 'confiscated' then 'expired_confiscated' else aman.n_status(n.id) end,
        'protection_status_label', aman.status_label(aman.n_status(n.id))) order by n.created_at) from public.numbers n where n.owner_id = u.id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'request_number', aman.req_no(r.request_no), 'operation_type', r.operation_type,
        'status', r.status, 'created_at', r.submitted_at) order by r.submitted_at desc) from public.operation_requests r where r.customer_id = u.id), '[]'::jsonb),
    'status_history', coalesce((select jsonb_agg(jsonb_build_object('status', h.status, 'reason', h.reason, 'changed_at', h.changed_at) order by h.changed_at desc)
        from public.profile_status_history h where h.profile_id = u.id), '[]'::jsonb))));
end $$;

create function public.admin_update_customer_status(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); u public.profiles; ns text := p->>'status'; rs text := nullif(btrim(coalesce(p->>'reason', '')), '');
begin
  if a is null then return aman.auth_err(); end if;
  select * into u from public.profiles where id = aman.uuid_or_null(p->>'customer_id') and role = 'customer' for update;
  if u.id is null or ns not in ('active', 'disabled') or u.status::text = ns then
    return aman.err('invalid_status_change', 'تعذر تغيير حالة الحساب.');
  end if;
  if ns = 'disabled' then
    update public.profiles set status = 'disabled', disabled_at = now(), disabled_by = a, disabled_reason = rs where id = u.id;
  else
    update public.profiles set status = 'active', disabled_at = null, disabled_by = null, disabled_reason = null where id = u.id;
  end if;
  insert into public.profile_status_history(profile_id, status, reason, changed_by) values (u.id, ns::public.account_status, case when ns = 'disabled' then rs end, a);
  perform aman.audit(a, case when ns = 'disabled' then 'customer_disabled' else 'customer_enabled' end, 'customer', u.id::text,
    case when ns = 'disabled' then 'تعطيل' else 'إعادة تفعيل' end || ' حساب ' || coalesce(nullif(u.full_name, ''), u.email), case when ns = 'disabled' then rs end);
  return aman.ok();
end $$;

create function public.admin_list_tasks(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object(
    'tasks', coalesce((select jsonb_agg(aman.task_view(t.id) order by t.due_at) from public.tasks t
        where t.closed_at is null and (t.status = 'executed' or aman.n_status(t.number_id) <> 'confiscated')), '[]'::jsonb),
    'companies', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name) from public.companies), '[]'::jsonb)));
end $$;

create function public.admin_get_task(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare t public.tasks; pr public.protections;
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  select * into t from public.tasks where id = aman.uuid_or_null(p->>'task_id');
  if t.id is null then return aman.err('not_found', 'المهمة غير موجودة.'); end if;
  pr := aman.cur_prot(t.number_id);
  return aman.ok(jsonb_build_object('task', aman.task_view(t.id) || jsonb_build_object('protection_context', pr.package_name)));
end $$;

create function public.admin_execute_task(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); t public.tasks; ph text;
begin
  if a is null then return aman.auth_err(); end if;
  select * into t from public.tasks where id = aman.uuid_or_null(p->>'task_id') for update;
  if t.id is null or t.status = 'executed' or t.closed_at is not null then
    return aman.err('task_not_available', 'المهمة غير متاحة للتنفيذ أو سبق تنفيذها.');
  end if;
  if aman.n_status(t.number_id) <> 'protected' then
    return aman.err('task_not_executable', 'لا تُنفَّذ المهمة إلا والرقم محمي (ضمن فترة الاشتراك).');
  end if;
  update public.tasks set status = 'executed', executed_at = now(), executed_by = a where id = t.id;
  update public.numbers set plan_anchor_at = now() where id = t.number_id;
  perform aman.plan_next(t.number_id);
  select number into ph from public.numbers where id = t.number_id;
  perform aman.audit(a, 'task_executed', 'task', t.id::text, 'تسجيل تنفيذ مهمة سداد للرقم ' || ph);
  return aman.ok();
end $$;

create function public.admin_preview_reschedule(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare tg jsonb; t public.tasks; nd timestamptz; iv int; e timestamptz; cnt int := 1;
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  tg := aman.resched_target(aman.uuid_or_null(p->>'task_id'), p->>'new_due_at');
  if tg ? 'error' then return tg->'error'; end if;
  select * into t from public.tasks where id = aman.uuid_or_null(p->>'task_id');
  nd := (tg->>'next_due')::timestamptz;
  iv := (aman.cfg(t.company_id)->>'interval_days')::int;
  e := aman.eff_end(aman.cur_prot(t.number_id));
  if iv is not null and iv >= 1 and e >= nd then cnt := least(1000, 1 + floor(extract(epoch from (e - nd)) / (iv * 86400))::int); end if;
  return aman.ok(jsonb_build_object('affected_count', cnt, 'new_due_at', nd, 'confiscation_date', aman.day_end(nd)));
end $$;

create function public.admin_reschedule_task(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); tg jsonb; t public.tasks; nd timestamptz; ph text;
begin
  if a is null then return aman.auth_err(); end if;
  tg := aman.resched_target(aman.uuid_or_null(p->>'task_id'), p->>'new_due_at');
  if tg ? 'error' then return tg->'error'; end if;
  nd := (tg->>'next_due')::timestamptz;
  update public.tasks set due_at = nd where id = aman.uuid_or_null(p->>'task_id') returning * into t;
  select number into ph from public.numbers where id = t.number_id;
  perform aman.audit(a, 'task_rescheduled', 'task', t.id::text, 'إعادة جدولة مهمة الرقم ' || ph);
  return aman.ok(jsonb_build_object('due_at', nd, 'confiscation_date', aman.day_end(nd)));
end $$;

create function public.admin_list_complaints(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('reports', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'phone', n.number, 'reason', aman.report_label(r.reason_code), 'reason_code', r.reason_code, 'description', r.reason_text,
      'created_at', r.created_at, 'status', case when ac.id is null then 'open' else 'resolved' end,
      'customer_name', coalesce(nullif(u.full_name, ''), u.email, 'غير معروف'), 'company_name', co.name, 'number_id', n.id,
      'protection_owner', coalesce(nullif(o.full_name, ''), o.email), 'protection_active', aman.n_status(n.id) = 'protected',
      'decision', case ac.decision when 'protection_terminated' then 'terminate_protection' else ac.decision::text end,
      'decision_reason', ac.reason_text, 'decided_at', ac.decided_at) order by r.created_at desc)
    from public.reports r
    join public.numbers n on n.id = r.number_id
    join public.companies co on co.id = n.company_id
    join public.profiles u on u.id = r.reporter_id
    left join public.profiles o on o.id = n.owner_id
    left join public.report_actions ac on ac.report_id = r.id), '[]'::jsonb)));
end $$;

create function public.admin_decide_complaint(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); r public.reports; n public.numbers; dc text := p->>'decision'; rs text := btrim(coalesce(p->>'reason', '')); pr public.protections; pid uuid;
begin
  if a is null then return aman.auth_err(); end if;
  select * into r from public.reports where id = aman.uuid_or_null(p->>'report_id') for update;
  if r.id is null or exists (select 1 from public.report_actions x where x.report_id = r.id) or dc not in ('no_action', 'terminate_protection') or rs = '' then
    return aman.err('invalid_request', 'البلاغ أو القرار غير متاح، وسبب القرار إلزامي.');
  end if;
  select * into n from public.numbers where id = r.number_id;
  if dc = 'terminate_protection' then
    if aman.n_status(n.id) <> 'protected' then return aman.err('no_active_protection', 'لا توجد حماية سارية لإنهائها.'); end if;
    pr := aman.cur_prot(n.id);
    update public.protections set terminated_at = now(), terminated_by = a, terminate_report_id = r.id where id = pr.id;
    pid := pr.id;
    insert into public.protection_events(protection_id, event_type, report_id) values (pid, 'admin_terminated', r.id);
    perform aman.notify(n.owner_id, 'إنهاء الحماية', 'أُنهيت الحماية على الرقم ' || n.number || ' بقرار إداري.', 'protection_terminated');
  end if;
  insert into public.report_actions(report_id, decision, reason_text, protection_id, decided_by)
  values (r.id, case dc when 'terminate_protection' then 'protection_terminated' else 'no_action' end::public.report_decision, rs, pid, a);
  perform aman.audit(a, 'complaint_' || dc, 'complaint', r.id::text, 'قرار في بلاغ على الرقم ' || n.number, rs);
  return aman.ok();
end $$;