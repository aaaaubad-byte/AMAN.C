create or replace function aman.is_int(j jsonb) returns boolean language sql immutable as
$$ select case when j is not null and jsonb_typeof(j) = 'number'
          then (j #>> '{}')::numeric = trunc((j #>> '{}')::numeric) else false end $$;
create function aman.int_of(j jsonb) returns integer language sql immutable as
$$ select case when aman.is_int(j) then (j #>> '{}')::integer end $$;
create function aman.flag(j jsonb, dflt boolean) returns boolean language sql immutable as
$$ select case when j = 'true'::jsonb then true when j = 'false'::jsonb then false else dflt end $$;
create function aman.regex_ok(t text) returns boolean language plpgsql immutable as
$$ begin perform '' ~ t; return true; exception when others then return false; end $$;

create function aman.company_json(p_company uuid) returns jsonb language sql stable as
$$ select jsonb_build_object('id', c.id, 'name', c.name,
     'prefixes', coalesce((select jsonb_agg(cp.prefix order by cp.prefix) from public.company_prefixes cp where cp.company_id = c.id), '[]'::jsonb),
     'number_lengths', coalesce((select jsonb_agg(distinct l order by l) from public.company_prefixes cp, unnest(cp.lengths) l where cp.company_id = c.id), '[]'::jsonb),
     'task_interval_days', ts.interval_days, 'task_due_window_days', coalesce(ts.task_due_window_days, 0),
     'is_active', c.active, 'create_first_task', coalesce(ts.create_first_on_activation, false),
     'reactivation_enabled', coalesce(rs.allow_reactivation, false), 'reactivation_days', coalesce(rs.reactivation_grace_days, 0),
     'created_at', c.created_at)
   from public.companies c
   left join public.company_task_settings ts on ts.company_id = c.id
   left join public.reactivation_settings rs on rs.company_id = c.id
   where c.id = p_company $$;

create function aman.promote_admin(p_email text) returns text language plpgsql as $$
declare u public.profiles;
begin
  if exists (select 1 from public.profiles where role = 'admin') then return 'admin_exists'; end if;
  select * into u from public.profiles where lower(email) = lower(btrim(p_email));
  if u.id is null then return 'user_not_found'; end if;
  update public.profiles set role = 'admin' where id = u.id;
  insert into public.audit_log(actor_id, action, entity_type, entity_id, result, summary)
  values (null, 'first_admin_created', 'admin', u.id::text, 'success', 'إنشاء المدير الأول عبر إجراء التهيئة الآمن');
  return 'ok';
end $$;

create function public.admin_list_notifications(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object(
    'items', coalesce((select jsonb_agg(q.x order by q.x->>'created_at' desc) from (
        select jsonb_build_object('id', b.id, 'customer_id', b.customer_id, 'title', b.title, 'body', b.body, 'created_at', b.created_at,
          'status', 'created', 'source', 'manual', 'source_label', 'يدوي',
          'customer_name', coalesce((select coalesce(nullif(u.full_name, ''), u.email) from public.profiles u where u.id = b.customer_id), 'جميع العملاء'),
          'read_summary', case when (select count(*) from public.notifications n where n.broadcast_id = b.id) = 0 then '—'
              else (select count(*) filter (where n.read_at is not null) || ' / ' || count(*) from public.notifications n where n.broadcast_id = b.id) end) as x
        from public.notification_broadcasts b
        union all
        select jsonb_build_object('id', n.id, 'customer_id', n.customer_id, 'title', n.title, 'body', n.body, 'created_at', n.created_at, 'read_at', n.read_at,
          'source', 'automatic', 'source_label', 'آلي', 'customer_name', coalesce(nullif(u.full_name, ''), u.email, 'غير معروف'),
          'read_summary', case when n.read_at is not null then 'مقروء' else 'غير مقروء' end)
        from public.notifications n left join public.profiles u on u.id = n.customer_id where n.broadcast_id is null) q), '[]'::jsonb),
    'customers', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'name', coalesce(nullif(u.full_name, ''), u.email)) order by u.created_at) from public.profiles u where u.role = 'customer'), '[]'::jsonb)));
end $$;

create function public.admin_create_notification(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); ti text := btrim(coalesce(p->>'title', '')); bo text := btrim(coalesce(p->>'body', ''));
  cid uuid := aman.uuid_or_null(p->>'customer_id'); bid uuid; k int;
begin
  if a is null then return aman.auth_err(); end if;
  if ti = '' or bo = '' then return aman.err('invalid_request', 'العنوان والنص مطلوبان.'); end if;
  if nullif(p->>'customer_id', '') is not null and not exists (select 1 from public.profiles where id = cid and role = 'customer') then
    return aman.err('not_found', 'العميل غير موجود.');
  end if;
  insert into public.notification_broadcasts(customer_id, title, body, created_by) values (cid, ti, bo, a) returning id into bid;
  insert into public.notifications(customer_id, source, created_by, title, body, broadcast_id)
  select u.id, 'manual', a, ti, bo, bid from public.profiles u where u.role = 'customer' and (cid is null or u.id = cid);
  get diagnostics k = row_count;
  perform aman.audit(a, 'admin_notification_created', 'notification', bid::text, 'إنشاء إشعار يدوي');
  return aman.ok(jsonb_build_object('recipient_count', k));
end $$;

create function public.admin_list_alerts(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'number_id', x.number_id, 'phone', n.number, 'customer_id', x.customer_id, 'title', x.title, 'body', x.body,
        'created_at', x.created_at, 'read_at', x.read_at, 'source', 'manual', 'customer_name', coalesce(nullif(u.full_name, ''), u.email, 'غير معروف')) order by x.created_at desc)
    from public.number_alerts x join public.numbers n on n.id = x.number_id left join public.profiles u on u.id = x.customer_id), '[]'::jsonb)));
end $$;

create function public.admin_create_alert(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); n public.numbers; ti text := btrim(coalesce(p->>'title', '')); bo text := btrim(coalesce(p->>'body', '')); aid uuid;
begin
  if a is null then return aman.auth_err(); end if;
  select * into n from public.numbers where id = aman.uuid_or_null(p->>'number_id');
  if n.id is null or n.owner_id is null or not exists (select 1 from public.profiles where id = n.owner_id and role = 'customer') then
    return aman.err('invalid_relation', 'الرقم غير مرتبط بعميل صالح.');
  end if;
  if ti = '' or bo = '' then return aman.err('invalid_request', 'العنوان والنص مطلوبان.'); end if;
  insert into public.number_alerts(number_id, customer_id, source, created_by, title, body) values (n.id, n.owner_id, 'manual', a, ti, bo) returning id into aid;
  perform aman.audit(a, 'admin_alert_created', 'number_alert', aid::text, 'إنشاء تنبيه يدوي للرقم ' || n.number);
  return aman.ok();
end $$;

create function public.admin_list_companies(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('companies', coalesce((select jsonb_agg(aman.company_json(c.id) order by c.sort_order, c.created_at) from public.companies c), '[]'::jsonb)));
end $$;

create function public.admin_preview_company(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare cid uuid := aman.uuid_or_null(p->>'company_id'); iv int := aman.int_of(p->'task_interval_days'); old int; delta int;
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  if not exists (select 1 from public.companies where id = cid) or iv is null or iv < 1 then return aman.err('invalid_request', 'إعدادات الشركة غير صحيحة.'); end if;
  select interval_days into old from public.company_task_settings where company_id = cid;
  delta := iv - coalesce(old, iv);
  return aman.ok(jsonb_build_object('delta_days', delta, 'affected_tasks',
    case when delta = 0 then 0 else (select count(*) from public.tasks t where t.company_id = cid and t.status <> 'executed' and t.closed_at is null) end));
end $$;

create function public.admin_save_company(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); cid uuid := aman.uuid_or_null(p->>'id'); nm text := btrim(coalesce(p->>'name', '')); pf text[]; ln int[];
  iv int := aman.int_of(p->'task_interval_days'); wd int := aman.int_of(p->'task_due_window_days'); rd int := aman.int_of(p->'reactivation_days');
  old int; delta int; cf text; x text; isnew boolean;
begin
  if a is null then return aman.auth_err(); end if;
  if nm = '' then return aman.err('validation_failed', 'اسم الشركة مطلوب.'); end if;
  if coalesce(jsonb_typeof(p->'prefixes'), '') <> 'array' or jsonb_array_length(p->'prefixes') = 0
     or exists (select 1 from jsonb_array_elements(p->'prefixes') e where jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ '^[0-9]+$') then
    return aman.err('validation_failed', 'البادئات مطلوبة ويجب أن تكون أرقامًا فقط.');
  end if;
  pf := array(select e #>> '{}' from jsonb_array_elements(p->'prefixes') e);
  if cardinality(pf) <> (select count(distinct v) from unnest(pf) v) then return aman.err('validation_failed', 'البادئات مكررة.'); end if;
  if coalesce(jsonb_typeof(p->'number_lengths'), '') <> 'array' or jsonb_array_length(p->'number_lengths') = 0
     or exists (select 1 from jsonb_array_elements(p->'number_lengths') e where not aman.is_int(e) or coalesce(aman.int_of(e), 0) < 1) then
    return aman.err('validation_failed', 'أطوال الأرقام مطلوبة ويجب أن تكون أعدادًا صحيحة موجبة.');
  end if;
  ln := array(select aman.int_of(e) from jsonb_array_elements(p->'number_lengths') e);
  if iv is null or iv < 1 then return aman.err('validation_failed', 'الفاصل الدوري يجب أن يكون عددًا صحيحًا موجبًا.'); end if;
  if (p ? 'task_due_window_days' or cid is null) and (wd is null or wd < 0) then
    return aman.err('validation_failed', 'نافذة ظهور المهام المستحقة مطلوبة ويجب أن تكون عددًا صحيحًا غير سالب.');
  end if;
  if rd is null or rd < 0 then return aman.err('validation_failed', 'مهلة التنشيط قبل المصادرة يجب أن تكون عددًا صحيحًا غير سالب.'); end if;
  foreach x in array array['is_active', 'create_first_task', 'reactivation_enabled'] loop
    if coalesce(jsonb_typeof(p->x), '') <> 'boolean' then return aman.err('validation_failed', 'إعدادات الشركة غير مكتملة.'); end if;
  end loop;
  isnew := cid is null;
  if not isnew and not exists (select 1 from public.companies where id = cid) then return aman.err('not_found', 'الشركة غير موجودة.'); end if;
  if exists (select 1 from public.companies c where c.name = nm and (isnew or c.id <> cid)) then return aman.err('duplicate_name', 'اسم الشركة مستخدم بالفعل.'); end if;
  select c2.name into cf from public.company_prefixes cp join public.companies c2 on c2.id = cp.company_id
   where cp.prefix = any(pf) and (isnew or cp.company_id <> cid) limit 1;
  if cf is not null then return aman.err('prefix_conflict', 'توجد بادئة مستخدمة بالفعل لدى شركة أخرى: ' || cf); end if;

  if isnew then
    insert into public.companies(name, active) values (nm, (p->>'is_active')::boolean) returning id into cid;
  else
    select interval_days into old from public.company_task_settings where company_id = cid;
    delta := iv - coalesce(old, iv);
    if delta <> 0 then
      update public.tasks set due_at = due_at + aman.secs_days(delta) where company_id = cid and status <> 'executed' and closed_at is null;
    end if;
    update public.companies set name = nm, active = (p->>'is_active')::boolean, updated_at = now() where id = cid;
  end if;
  delete from public.company_prefixes where company_id = cid and prefix <> all(pf);
  insert into public.company_prefixes(company_id, prefix, lengths)
  select cid, v, ln from unnest(pf) v
  on conflict (prefix) do update set lengths = excluded.lengths, active = true;
  insert into public.company_task_settings(company_id, create_first_on_activation, interval_days, task_due_window_days, updated_by)
  values (cid, (p->>'create_first_task')::boolean, iv, coalesce(wd, 0), a)
  on conflict (company_id) do update set create_first_on_activation = excluded.create_first_on_activation, interval_days = excluded.interval_days,
    task_due_window_days = coalesce(wd, public.company_task_settings.task_due_window_days), updated_at = now(), updated_by = a;
  update public.reactivation_settings set allow_reactivation = (p->>'reactivation_enabled')::boolean, reactivation_grace_days = rd, updated_at = now(), updated_by = a where company_id = cid;
  if not found then
    insert into public.reactivation_settings(company_id, allow_reactivation, reactivation_grace_days, updated_by)
    values (cid, (p->>'reactivation_enabled')::boolean, rd, a);
  end if;
  perform aman.audit(a, case when isnew then 'company_created' else 'company_settings_updated' end, 'company', cid::text,
    case when isnew then 'إضافة شركة اتصالات' else 'تحديث إعدادات شركة' end);
  return aman.ok(jsonb_build_object('company', aman.company_json(cid)));
end $$;

create function public.admin_list_packages(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', k.id, 'company_id', k.company_id, 'operation_type', k.operation_type, 'name', k.name, 'days', k.days,
        'price_yer', k.price_yer, 'active', k.active, 'operation_label', aman.op_label(k.operation_type), 'company_name', co.name) order by co.name, k.operation_type, k.days)
    from public.protection_packages k join public.companies co on co.id = k.company_id), '[]'::jsonb)));
end $$;

create function public.admin_save_package(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); kid uuid := aman.uuid_or_null(p->>'id'); cid uuid := aman.uuid_or_null(p->>'company_id'); nm text := btrim(coalesce(p->>'name', ''));
  dy int := aman.int_of(p->'days'); pr int := aman.int_of(p->'price_yer'); op public.operation_type; isnew boolean := kid is null;
begin
  if a is null then return aman.auth_err(); end if;
  begin op := (p->>'operation_type')::public.operation_type; exception when others then op := null; end;
  if not exists (select 1 from public.companies where id = cid) or nm = '' or dy is null or dy < 1 or pr is null or pr < 1 or op is null
     or coalesce(jsonb_typeof(p->'active'), '') <> 'boolean' then
    return aman.err('validation_failed', 'بيانات الباقة غير صحيحة: الشركة والاسم ونوع العملية، والمدة والسعر أعداد صحيحة موجبة.');
  end if;
  if isnew then
    insert into public.protection_packages(company_id, operation_type, name, days, price_yer, active) values (cid, op, nm, dy, pr, (p->>'active')::boolean) returning id into kid;
  else
    update public.protection_packages set company_id = cid, operation_type = op, name = nm, days = dy, price_yer = pr, active = (p->>'active')::boolean, updated_at = now() where id = kid;
    if not found then return aman.err('not_found', 'الباقة غير موجودة.'); end if;
  end if;
  perform aman.audit(a, case when isnew then 'package_created' else 'package_updated' end, 'package', kid::text, case when isnew then 'إضافة باقة حماية' else 'تعديل بيانات باقة حماية' end);
  return aman.ok();
end $$;

create function public.admin_list_payment_methods(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'summary', coalesce(m.summary, ''), 'account_number', coalesce(m.account_number, ''),
        'instructions', m.instructions, 'reference_required', m.reference_required, 'reference_pattern', m.reference_pattern, 'active', m.active) order by m.sort_order, m.created_at)
    from public.payment_methods m), '[]'::jsonb)));
end $$;

create function public.admin_save_payment_method(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm(); mid uuid := aman.uuid_or_null(p->>'id'); nm text := btrim(coalesce(p->>'name', '')); ins text := btrim(coalesce(p->>'instructions', ''));
  acc text := btrim(coalesce(p->>'account_number', '')); pt text := nullif(p->>'reference_pattern', ''); isnew boolean := mid is null;
begin
  if a is null then return aman.auth_err(); end if;
  if nm = '' or ins = '' then return aman.err('validation_failed', 'الاسم والتعليمات مطلوبان.'); end if;
  if p ? 'account_number' and jsonb_typeof(p->'account_number') not in ('string', 'null') then return aman.err('validation_failed', 'رقم الحساب يجب أن يكون نصًا.'); end if;
  if char_length(acc) > 100 then return aman.err('validation_failed', 'رقم الحساب أطول من 100 حرف.'); end if;
  if pt is not null and not aman.regex_ok(pt) then return aman.err('reference_pattern_invalid', 'صيغة مرجع الدفع غير صالحة.'); end if;
  if isnew then
    insert into public.payment_methods(name, summary, account_number, instructions, reference_required, reference_pattern, active)
    values (nm, nullif(btrim(coalesce(p->>'summary', '')), ''), nullif(acc, ''), ins, aman.flag(p->'reference_required', true), pt, aman.flag(p->'active', true)) returning id into mid;
  else
    update public.payment_methods set name = nm, summary = nullif(btrim(coalesce(p->>'summary', '')), ''), account_number = nullif(acc, ''), instructions = ins,
      reference_required = aman.flag(p->'reference_required', true), reference_pattern = pt, active = aman.flag(p->'active', true), updated_at = now() where id = mid;
    if not found then return aman.err('not_found', 'وسيلة الدفع غير موجودة.'); end if;
  end if;
  perform aman.audit(a, case when isnew then 'payment_method_created' else 'payment_method_updated' end, 'payment_method', mid::text, case when isnew then 'إضافة وسيلة دفع' else 'تعديل وسيلة دفع' end);
  return aman.ok();
end $$;

create function public.admin_get_content(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', (select jsonb_object_agg(key, body) from public.app_content)));
end $$;

create function public.admin_save_content(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare a uuid := aman.adm();
begin
  if a is null then return aman.auth_err(); end if;
  if p->>'key' not in ('terms', 'privacy', 'contact', 'help') or jsonb_typeof(p->'body') <> 'string' then
    return aman.err('validation_failed', 'بيانات النص غير صحيحة.');
  end if;
  update public.app_content set body = p->>'body', updated_at = now(), updated_by = a where key = p->>'key';
  perform aman.audit(a, 'content_updated', 'app_content', p->>'key', 'تحديث النص الثابت: ' || (p->>'key'));
  return aman.ok();
end $$;

create function public.admin_list_audit(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare lim int := aman.int_of(p->'limit');
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'action', x.action, 'entity_type', x.entity_type, 'entity_id', x.entity_id, 'summary', x.summary,
        'reason', x.reason, 'actor_id', x.actor_id, 'actor_name', x.actor_name, 'admin_name', x.actor_name, 'created_at', x.created_at) order by x.created_at desc, x.id desc)
      from (select l.*, coalesce(nullif(u.full_name, ''), u.email, 'النظام') as actor_name from public.audit_log l left join public.profiles u on u.id = l.actor_id
            order by l.created_at desc, l.id desc limit least(coalesce(lim, 1000), 1000)) x), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(distinct action) from public.audit_log), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(distinct entity_type) from public.audit_log), '[]'::jsonb)));
end $$;

create function public.admin_revenue(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare dy numeric; cutoff timestamptz; v jsonb; allp boolean := (p->>'days') = 'all';
begin
  if aman.adm() is null then return aman.auth_err(); end if;
  if not allp then
    begin dy := coalesce(nullif(p->>'days', '')::numeric, 30); exception when others then dy := 30; end;
    cutoff := now() - aman.secs_days(dy);
  end if;
  with o as (
    select r.id, aman.op_label(r.operation_type) as op, co.name as cname, r.package_snapshot->>'name' as pname,
           r.payment_method_snapshot->>'name' as pm, (r.package_snapshot->>'price_yer')::bigint as price, r.reviewed_at
    from public.operation_requests r join public.companies co on co.id = r.company_id
    where r.status = 'approved' and (allp or r.reviewed_at >= cutoff))
  select jsonb_build_object('count', (select count(*) from o), 'total_yer', (select coalesce(sum(price), 0) from o),
    'period_label', case when allp then 'كل الفترات' else 'آخر ' || trunc(dy)::text || ' يومًا' end,
    'by_operation', coalesce((select jsonb_agg(jsonb_build_object('name', g.k, 'count', g.c, 'total_yer', g.t)) from (select op as k, count(*) c, sum(price) t from o group by op) g), '[]'::jsonb),
    'by_company', coalesce((select jsonb_agg(jsonb_build_object('name', g.k, 'count', g.c, 'total_yer', g.t)) from (select cname as k, count(*) c, sum(price) t from o group by cname) g), '[]'::jsonb),
    'by_package', coalesce((select jsonb_agg(jsonb_build_object('name', g.k, 'count', g.c, 'total_yer', g.t)) from (select pname as k, count(*) c, sum(price) t from o group by pname) g), '[]'::jsonb),
    'by_payment', coalesce((select jsonb_agg(jsonb_build_object('name', g.k, 'count', g.c, 'total_yer', g.t)) from (select pm as k, count(*) c, sum(price) t from o group by pm) g), '[]'::jsonb),
    'operations', coalesce((select jsonb_agg(aman.req_json(o.id) order by o.reviewed_at desc) from o), '[]'::jsonb))
  into v;
  return aman.ok(v);
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'aman' loop
    execute format('alter function %s set search_path = public, aman, pg_temp', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace s on s.oid = p.pronamespace
           where s.nspname = 'public' and (p.proname like 'client\_%' or p.proname like 'admin\_%') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;