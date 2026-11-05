create function public.client_get_session(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare u public.profiles;
begin
  select * into u from public.profiles where id = (select auth.uid());
  if u.id is null or u.role <> 'customer' or u.status <> 'active' then
    return aman.ok(jsonb_build_object('user', null));
  end if;
  return aman.ok(jsonb_build_object('user', jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', coalesce(u.full_name, ''), 'status', u.status,
    'account_type', case when exists (select 1 from public.operation_requests r where r.customer_id = u.id and r.status = 'approved') then 'customer' else 'user' end)));
end $$;

create function public.client_lookup_number(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust(); ph text; m record; n public.numbers; s text; base jsonb;
begin
  if c is null then return aman.auth_err(); end if;
  ph := aman.norm_phone(p->>'phone');
  if ph !~ '^\d{7,15}$' then return aman.err('invalid_number', 'تحقق من رقم الهاتف المدخل.'); end if;
  if not exists (select 1 from public.companies where active) then
    return aman.err('no_companies', 'لا توجد شركات مُهيأة بعد. حاول لاحقًا.');
  end if;
  select * into m from aman.match_company(ph);
  if m.id is null then return aman.err('unknown_prefix', 'بادئة الرقم غير معروفة. تحقق من الرقم.'); end if;
  if array_position(m.lengths, length(ph)) is null then return aman.err('invalid_length', 'طول الرقم لا يطابق أرقام هذه الشركة.'); end if;
  base := jsonb_build_object('phone', ph, 'company', m.name, 'company_id', m.id);
  select * into n from public.numbers where number = ph;
  if n.id is null or n.owner_id is null then return aman.ok(jsonb_build_object('number', base || '{"status":"not_subscribed"}')); end if;
  s := aman.n_status(n.id);
  if n.owner_id = c then return aman.ok(jsonb_build_object('number', aman.num_view(n.id))); end if;
  return aman.ok(jsonb_build_object('number', base || jsonb_build_object('status', case when s = 'protected' then 'other_protected' else 'not_subscribed' end)));
end $$;

create function public.client_list_my_numbers(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust();
begin
  if c is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', coalesce((
    select jsonb_agg(aman.num_view(n.id) order by n.created_at) from public.numbers n where n.owner_id = c), '[]'::jsonb)));
end $$;

create function public.client_list_my_operations(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust();
begin
  if c is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'request_number', aman.req_no(r.request_no), 'type', r.operation_type, 'status', r.status,
      'phone', n.number, 'company', co.name, 'package_name', r.package_snapshot->>'name',
      'duration_days', (r.package_snapshot->>'days')::int, 'price_yer', (r.package_snapshot->>'price_yer')::int,
      'payment_method', r.payment_method_snapshot->>'name', 'payment_reference', r.payment_reference,
      'created_at', r.submitted_at, 'rejection_reason', rr.label, 'rejection_note', r.reject_reason_note)
      order by r.submitted_at desc)
    from public.operation_requests r
    join public.numbers n on n.id = r.number_id
    join public.companies co on co.id = r.company_id
    left join public.rejection_reasons rr on rr.id = r.reject_reason_id
    where r.customer_id = c), '[]'::jsonb)));
end $$;

create function public.client_get_catalog(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust(); comp uuid := aman.uuid_or_null(p->>'company_id'); op text := nullif(p->>'operation_type', '');
begin
  if c is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object(
    'packages', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name, 'company_id', k.company_id,
        'operation_type', k.operation_type, 'duration_days', k.days, 'price_yer', k.price_yer) order by k.days, k.price_yer)
      from public.protection_packages k
      where k.active and (comp is null or k.company_id = comp) and (op is null or k.operation_type::text = op)), '[]'::jsonb),
    'payment_methods', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'account_number', coalesce(m.account_number, ''),
        'instructions', m.instructions, 'reference_required', m.reference_required, 'reference_pattern', m.reference_pattern)
        order by m.sort_order, m.created_at)
      from public.payment_methods m where m.active), '[]'::jsonb)));
end $$;

create function public.client_submit_request(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust(); ph text := aman.norm_phone(p->>'phone'); op public.operation_type;
  comp public.companies; pk public.protection_packages; pm public.payment_methods; ref text; n public.numbers;
  iss jsonb; m record; st text; rid uuid; rno bigint;
begin
  if c is null then return aman.auth_err(); end if;
  begin op := (p->>'operation_type')::public.operation_type; exception when others then op := null; end;
  if ph !~ '^\d{7,15}$' or op is null then return aman.err('invalid_request', 'بيانات الطلب غير مكتملة.'); end if;
  select * into comp from public.companies where id = aman.uuid_or_null(p->>'company_id');
  select * into pk from public.protection_packages where id = aman.uuid_or_null(p->>'package_id');
  select * into pm from public.payment_methods where id = aman.uuid_or_null(p->>'payment_method_id');
  if comp.id is null or pk.id is null or pm.id is null or not pk.active or not pm.active or not comp.active
     or pk.company_id <> comp.id or pk.operation_type <> op then
    return aman.err('unavailable_package', 'الباقة أو وسيلة الدفع غير متاحة لهذه العملية.');
  end if;
  ref := btrim(coalesce(p->>'payment_reference', ''));
  if pm.reference_required and ref = '' then return aman.err('reference_required', 'أدخل مرجع الدفع.'); end if;
  if ref <> '' and pm.reference_pattern is not null then
    begin
      if ref !~ pm.reference_pattern then return aman.err('reference_format', 'صيغة مرجع الدفع غير مطابقة.'); end if;
    exception when invalid_regular_expression then
      return aman.err('reference_pattern_invalid', 'صيغة مرجع الدفع غير صالحة في إعدادات الوسيلة.');
    end;
  end if;
  select * into m from aman.match_company(ph);
  if m.id is null or m.id <> comp.id or array_position(m.lengths, length(ph)) is null then
    return aman.err('invalid_request', 'الرقم لا يطابق الشركة المختارة.');
  end if;
  select * into n from public.numbers where number = ph;
  iss := aman.elig(op, n.id, c);
  if iss is not null then return aman.err(iss->>'code', iss->>'message'); end if;
  if n.id is not null and exists (select 1 from public.operation_requests r where r.number_id = n.id and r.customer_id = c and r.status = 'pending') then
    return aman.err('duplicate_request', 'لديك طلب قيد المراجعة لهذا الرقم بالفعل.');
  end if;
  if n.id is null then
    insert into public.numbers(number, company_id) values (ph, comp.id) on conflict (number) do nothing;
    select * into n from public.numbers where number = ph;
  end if;
  st := aman.n_status(n.id);
  insert into public.operation_requests(customer_id, number_id, company_id, operation_type, package_id, package_snapshot,
      payment_method_id, payment_method_snapshot, payment_reference, idempotency_key, number_status_at_submit)
  values (c, n.id, comp.id, op, pk.id,
      jsonb_build_object('id', pk.id, 'name', pk.name, 'days', pk.days, 'price_yer', pk.price_yer),
      pm.id,
      jsonb_build_object('id', pm.id, 'name', pm.name, 'account_number', pm.account_number, 'instructions', pm.instructions),
      nullif(ref, ''), gen_random_uuid(), st)
  returning id, request_no into rid, rno;
  return aman.ok(jsonb_build_object('request_id', rid, 'request_number', aman.req_no(rno)));
end $$;

create function public.client_update_profile(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust(); nm text := btrim(coalesce(p->>'full_name', ''));
begin
  if c is null then return aman.auth_err(); end if;
  if char_length(nm) > 120 then return aman.err('invalid_name', 'الاسم أطول من المسموح.'); end if;
  update public.profiles set full_name = nm where id = c;
  return aman.ok();
end $$;

create function public.client_get_notifications(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust();
begin
  if c is null then return aman.auth_err(); end if;
  return aman.ok(jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'body', x.body, 'created_at', x.created_at, 'read_at', x.read_at) order by x.created_at desc)
    from public.notifications x where x.customer_id = c), '[]'::jsonb)));
end $$;

create function public.client_mark_notification_read(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust(); k int;
begin
  if c is null then return aman.auth_err(); end if;
  update public.notifications set read_at = coalesce(read_at, now()), delivery_status = 'read'
   where id = aman.uuid_or_null(p->>'notification_id') and customer_id = c;
  get diagnostics k = row_count;
  if k = 0 then return aman.err('not_found', 'الإشعار غير موجود.'); end if;
  return aman.ok();
end $$;

create function public.client_list_number_alerts(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust(); n public.numbers;
begin
  if c is null then return aman.auth_err(); end if;
  select * into n from public.numbers where number = aman.norm_phone(p->>'phone');
  if n.id is null or n.owner_id is distinct from c then return aman.err('not_found', 'الرقم غير مرتبط بحسابك.'); end if;
  return aman.ok(jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'created_at', a.created_at, 'read_at', a.read_at) order by a.created_at desc)
    from public.number_alerts a where a.number_id = n.id and a.customer_id = c), '[]'::jsonb)));
end $$;

create function public.client_submit_report(p jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, aman, pg_temp as $$
declare c uuid := aman.cust(); n public.numbers; rc public.report_reason_code; tx text := btrim(coalesce(p->>'reason_text', '')); rid uuid;
begin
  if c is null then return aman.auth_err(); end if;
  begin rc := (p->>'reason_code')::public.report_reason_code; exception when others then rc := null; end;
  if rc is null then return aman.err('invalid_reason', 'اختر سبب البلاغ.'); end if;
  if rc = 'other' and tx = '' then return aman.err('reason_text_required', 'أدخل توضيح البلاغ.'); end if;
  if char_length(tx) > 2000 then return aman.err('reason_text_too_long', 'التوضيح أطول من المسموح.'); end if;
  select * into n from public.numbers where number = aman.norm_phone(p->>'phone');
  if n.id is null or n.owner_id is null or n.owner_id = c or aman.n_status(n.id) <> 'protected' then
    return aman.err('report_not_allowed', 'لا يمكن تقديم بلاغ لهذا الرقم.');
  end if;
  if exists (select 1 from public.reports r where r.reporter_id = c and r.number_id = n.id
             and not exists (select 1 from public.report_actions a where a.report_id = r.id)) then
    return aman.err('duplicate_report', 'لديك بلاغ مفتوح لهذا الرقم بالفعل.');
  end if;
  insert into public.reports(reporter_id, number_id, reason_code, reason_text)
  values (c, n.id, rc, nullif(tx, '')) returning id into rid;
  return aman.ok(jsonb_build_object('report_id', rid));
end $$;