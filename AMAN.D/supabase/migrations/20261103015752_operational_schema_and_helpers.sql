alter table public.company_task_settings
  add column if not exists task_due_window_days integer not null default 0 check (task_due_window_days >= 0);
alter table public.payment_methods
  add column if not exists account_number text check (account_number is null or char_length(account_number) <= 100);
alter table public.numbers
  add column if not exists owner_id uuid references public.profiles(id) on delete restrict,
  add column if not exists plan_anchor_at timestamptz;
alter table public.operation_requests
  add column if not exists number_status_at_submit text;
alter table public.audit_log
  add column if not exists reason text;

create unique index if not exists tasks_one_pending_per_number
  on public.tasks(number_id) where status <> 'executed' and closed_at is null;
create index if not exists numbers_owner_idx on public.numbers(owner_id);
create index if not exists reports_number_idx on public.reports(number_id, reporter_id);

create table if not exists public.notification_broadcasts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table if not exists public.profile_status_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status public.account_status not null,
  reason text,
  changed_by uuid references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now()
);
alter table public.notification_broadcasts enable row level security;
alter table public.profile_status_history enable row level security;
revoke all on public.notification_broadcasts, public.profile_status_history from anon, authenticated;

insert into public.rejection_reasons(code, label, sort_order) values
  ('bad_reference', 'مرجع غير صحيح', 1),
  ('amount_short', 'مبلغ ناقص', 2),
  ('not_received', 'تحويل لم يصل', 3)
on conflict (code) do nothing;
insert into public.app_content(key, body) values ('terms',''),('privacy',''),('contact',''),('help','')
on conflict (key) do nothing;

create schema if not exists aman;
revoke all on schema aman from public, anon, authenticated;

create function aman.ok(p jsonb default '{}'::jsonb) returns jsonb language sql immutable as
$$ select jsonb_build_object('success', true) || coalesce(p, '{}'::jsonb) $$;

create function aman.err(p_code text, p_msg text) returns jsonb language sql immutable as
$$ select jsonb_build_object('success', false, 'code', p_code, 'message', p_msg) $$;

create function aman.auth_err() returns jsonb language sql immutable as
$$ select aman.err('auth_required', 'انتهت الجلسة أو لا توجد جلسة. سجّل الدخول.') $$;

create function aman.cust() returns uuid language sql stable as
$$ select id from public.profiles where id = (select auth.uid()) and role = 'customer' and status = 'active' $$;

create function aman.adm() returns uuid language sql stable as
$$ select id from public.profiles where id = (select auth.uid()) and role = 'admin' and status = 'active' $$;

create function aman.uuid_or_null(t text) returns uuid language plpgsql immutable as
$$ begin return t::uuid; exception when others then return null; end $$;

create function aman.is_int(j jsonb) returns boolean language sql immutable as
$$ select j is not null and jsonb_typeof(j) = 'number' and (j #>> '{}')::numeric = trunc((j #>> '{}')::numeric) $$;

create function aman.norm_phone(t text) returns text language sql immutable as
$$ select regexp_replace(translate(coalesce(t, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '\D', '', 'g') $$;

create function aman.req_no(n bigint) returns text language sql immutable as
$$ select 'AM-' || lpad(n::text, 6, '0') $$;

create function aman.day_start(t timestamptz) returns timestamptz language sql stable as
$$ select date_trunc('day', t at time zone 'Asia/Aden') at time zone 'Asia/Aden' $$;

create function aman.day_end(t timestamptz) returns timestamptz language sql stable as
$$ select (date_trunc('day', t at time zone 'Asia/Aden') + interval '1 day' - interval '1 millisecond') at time zone 'Asia/Aden' $$;

create function aman.secs_days(d numeric) returns interval language sql immutable as
$$ select make_interval(secs => d * 86400) $$;

create function aman.op_label(o public.operation_type) returns text language sql immutable as
$$ select case o when 'activation' then 'اشتراك' when 'extension' then 'تمديد الاشتراك' else 'تنشيط' end $$;

create function aman.status_label(s text) returns text language sql immutable as
$$ select case s when 'protected' then 'محمي' when 'inactive' then 'غير نشط' when 'confiscated' then 'منتهي-مصادر' else 'غير مشترك' end $$;

create function aman.report_label(c public.report_reason_code) returns text language sql immutable as
$$ select case c when 'mine' then 'الرقم يخصني' when 'lost_access' then 'الرقم مرتبط بحساب سابق فقدت الوصول إليه'
  when 'unauthorized' then 'تم تفعيل حماية رقمي دون علمي' else 'سبب آخر' end $$;

create function aman.audit(p_actor uuid, p_action text, p_type text, p_id text, p_summary text, p_reason text default null)
returns void language sql as
$$ insert into public.audit_log(actor_id, action, entity_type, entity_id, result, summary, reason)
   values (p_actor, p_action, p_type, p_id, 'success', p_summary, p_reason) $$;

create function aman.notify(p_customer uuid, p_title text, p_body text, p_event text default null)
returns void language sql as
$$ insert into public.notifications(customer_id, source, source_event, title, body)
   values (p_customer, 'auto', p_event, p_title, p_body) $$;

create function aman.cfg(p_company uuid) returns jsonb language sql stable as
$$ select jsonb_build_object(
     'interval_days', ts.interval_days,
     'create_first', coalesce(ts.create_first_on_activation, false),
     'window_days', coalesce(ts.task_due_window_days, 0),
     'react_enabled', coalesce(rs.allow_reactivation, false),
     'react_days', coalesce(rs.reactivation_grace_days, 0))
   from (select 1) d
   left join public.company_task_settings ts on ts.company_id = p_company
   left join lateral (
     select allow_reactivation, reactivation_grace_days from public.reactivation_settings
     where company_id = p_company or company_id is null order by company_id nulls last limit 1) rs on true $$;

create function aman.match_company(p_phone text)
returns table(id uuid, name text, lengths integer[]) language sql stable as
$$ select co.id, co.name, cp.lengths
   from public.company_prefixes cp join public.companies co on co.id = cp.company_id
   where co.active and cp.active and p_phone like cp.prefix || '%'
   order by length(cp.prefix) desc limit 1 $$;

create function aman.cur_prot(p_num uuid) returns public.protections language sql stable as
$$ select * from public.protections where number_id = p_num order by starts_at desc, created_at desc limit 1 $$;

create function aman.eff_end(p public.protections) returns timestamptz language sql immutable as
$$ select least(p.ends_at, coalesce(p.terminated_at, p.ends_at)) $$;

create function aman.pend(p_num uuid) returns public.tasks language sql stable as
$$ select * from public.tasks where number_id = p_num and status <> 'executed' and closed_at is null limit 1 $$;

create function aman.next_due(p_num uuid) returns timestamptz language plpgsql stable as $$
declare n public.numbers; c jsonb; a timestamptz; pr public.protections;
begin
  select * into n from public.numbers where id = p_num;
  if n.id is null then return null; end if;
  c := aman.cfg(n.company_id);
  pr := aman.cur_prot(p_num);
  a := coalesce(n.plan_anchor_at, pr.starts_at, n.created_at);
  if not (c->>'create_first')::boolean or a is null or (c->>'interval_days') is null or (c->>'interval_days')::int < 1 then
    return null;
  end if;
  return aman.day_start(a) + aman.secs_days((c->>'interval_days')::int);
end $$;

create function aman.conf_deadline(p_num uuid) returns timestamptz language plpgsql stable as $$
declare t public.tasks; d timestamptz; pr public.protections; n public.numbers; c jsonb; g int;
begin
  t := aman.pend(p_num);
  if t.id is not null then return aman.day_end(t.due_at); end if;
  d := aman.next_due(p_num);
  if d is not null then return aman.day_end(d); end if;
  select * into n from public.numbers where id = p_num;
  pr := aman.cur_prot(p_num);
  c := aman.cfg(n.company_id);
  g := case when (c->>'react_enabled')::boolean then (c->>'react_days')::int else 0 end;
  return aman.eff_end(pr) + aman.secs_days(g);
end $$;

create function aman.n_status(p_num uuid) returns text language plpgsql stable as $$
declare n public.numbers; pr public.protections; s text;
begin
  select * into n from public.numbers where id = p_num;
  if n.id is null or n.owner_id is null then return 'not_subscribed'; end if;
  pr := aman.cur_prot(p_num);
  if pr.id is null then return 'not_subscribed'; end if;
  s := case when aman.eff_end(pr) > now() then 'protected' else 'inactive' end;
  if now() > aman.conf_deadline(p_num) then s := 'confiscated'; end if;
  return s;
end $$;

create function aman.react_deadline(p_num uuid) returns timestamptz language plpgsql stable as $$
declare n public.numbers; c jsonb; g int; t public.tasks; d timestamptz; pr public.protections;
begin
  select * into n from public.numbers where id = p_num;
  if n.id is null then return null; end if;
  c := aman.cfg(n.company_id);
  if not (c->>'react_enabled')::boolean then return null; end if;
  g := (c->>'react_days')::int;
  t := aman.pend(p_num);
  d := case when t.id is not null then t.due_at else aman.next_due(p_num) end;
  if d is not null then return aman.day_end(aman.day_start(d) - aman.secs_days(g)); end if;
  pr := aman.cur_prot(p_num);
  return aman.eff_end(pr) + aman.secs_days(g);
end $$;

create function aman.elig(p_op public.operation_type, p_num uuid, p_cust uuid) returns jsonb language plpgsql stable as $$
declare n public.numbers; s text; d timestamptz;
begin
  if p_num is not null then
    select * into n from public.numbers where id = p_num;
    s := aman.n_status(p_num);
  end if;
  if p_op = 'activation' then
    if n.id is null or n.owner_id is null or (n.owner_id <> p_cust and s <> 'protected') then return null; end if;
    return jsonb_build_object('code', 'operation_not_allowed', 'message', 'الاشتراك غير متاح لحالة الرقم الحالية.');
  elsif p_op = 'extension' then
    if n.owner_id = p_cust and s = 'protected' then return null; end if;
    return jsonb_build_object('code', 'operation_not_allowed', 'message', 'تمديد الاشتراك متاح للرقم المحمي لدى حسابك فقط.');
  else
    if not (n.owner_id = p_cust and s = 'inactive') then
      return jsonb_build_object('code', 'operation_not_allowed', 'message', 'التنشيط متاح للرقم غير النشط لدى حسابك قبل تجاوز تاريخ المصادرة فقط.');
    end if;
    d := aman.react_deadline(p_num);
    if d is null then return jsonb_build_object('code', 'reactivation_disabled', 'message', 'التنشيط غير مسموح لهذه الشركة.'); end if;
    if now() > d then return jsonb_build_object('code', 'reactivation_window_closed', 'message', 'انتهت مهلة التنشيط لهذا الرقم قبل تاريخ المصادرة.'); end if;
    return null;
  end if;
end $$;

create function aman.plan_next(p_num uuid) returns void language plpgsql as $$
declare d timestamptz; pr public.protections; n public.numbers; sq int;
begin
  if (aman.pend(p_num)).id is not null then return; end if;
  d := aman.next_due(p_num);
  pr := aman.cur_prot(p_num);
  if d is null or pr.id is null or d > aman.eff_end(pr) then return; end if;
  select * into n from public.numbers where id = p_num;
  select coalesce(max(seq), 0) + 1 into sq from public.tasks where protection_id = pr.id;
  insert into public.tasks(protection_id, number_id, company_id, seq, due_at, status)
  values (pr.id, p_num, n.company_id, sq, d, 'planned');
end $$;

create function aman.num_view(p_num uuid) returns jsonb language plpgsql stable as $$
declare n public.numbers; s text; pr public.protections; co text; v jsonb; e timestamptz;
begin
  select * into n from public.numbers where id = p_num;
  select name into co from public.companies where id = n.company_id;
  s := aman.n_status(p_num);
  pr := aman.cur_prot(p_num);
  e := aman.eff_end(pr);
  v := jsonb_build_object('id', n.id, 'phone', n.number, 'company', co, 'company_id', n.company_id, 'status', s);
  if s in ('protected', 'inactive', 'confiscated') then
    v := v || jsonb_build_object('package_name', pr.package_name, 'duration_days', pr.total_days, 'starts_at', pr.starts_at, 'ends_at', e);
  end if;
  if s = 'protected' then
    v := v || jsonb_build_object('remaining_label', case when e > now() then ceil(extract(epoch from (e - now())) / 86400)::int || ' يوم' end);
  end if;
  if s = 'inactive' then v := v || jsonb_build_object('last_activation_date', aman.react_deadline(p_num)); end if;
  return v;
end $$;

create function aman.task_status(t public.tasks) returns text language sql stable as
$$ select case when t.status = 'executed' then 'executed'
   when now() >= aman.day_start(t.due_at) - aman.secs_days(coalesce((aman.cfg(t.company_id)->>'window_days')::int, 0)) then 'due'
   else 'planned' end $$;

create function aman.task_view(p_task uuid) returns jsonb language plpgsql stable as $$
declare t public.tasks; n public.numbers; co text; v jsonb;
begin
  select * into t from public.tasks where id = p_task;
  select * into n from public.numbers where id = t.number_id;
  select name into co from public.companies where id = t.company_id;
  v := jsonb_build_object('id', t.id, 'number_id', t.number_id, 'phone', n.number, 'company_id', t.company_id, 'company_name', co,
        'customer_id', n.owner_id, 'status', aman.task_status(t), 'due_at', t.due_at, 'created_at', t.created_at,
        'executed_at', t.executed_at, 'protection_id', t.protection_id,
        'due_window_days', coalesce((aman.cfg(t.company_id)->>'window_days')::int, 0));
  if t.status <> 'executed' then v := v || jsonb_build_object('confiscation_date', aman.day_end(t.due_at)); end if;
  return v;
end $$;

create function aman.req_json(p_req uuid) returns jsonb language sql stable as
$$ select jsonb_build_object(
     'id', r.id, 'request_number', aman.req_no(r.request_no), 'customer_id', r.customer_id,
     'customer_name', coalesce(nullif(pr.full_name, ''), pr.email), 'customer_email', pr.email,
     'phone', n.number, 'number_id', r.number_id, 'company_id', r.company_id, 'company_name', co.name,
     'operation_type', r.operation_type, 'operation_type_label', aman.op_label(r.operation_type),
     'package_id', r.package_id, 'package_name', r.package_snapshot->>'name',
     'duration_days', (r.package_snapshot->>'days')::int, 'price_yer', (r.package_snapshot->>'price_yer')::int,
     'payment_method_id', r.payment_method_id, 'payment_method_name', r.payment_method_snapshot->>'name',
     'payment_reference', r.payment_reference, 'status', r.status, 'created_at', r.submitted_at,
     'number_status_at_submit', r.number_status_at_submit,
     'approved_at', case when r.status = 'approved' then r.reviewed_at end,
     'rejected_at', case when r.status = 'rejected' then r.reviewed_at end,
     'reject_reason', rr.code, 'reject_reason_label', rr.label, 'reject_explanation', r.reject_reason_note)
   from public.operation_requests r
   join public.numbers n on n.id = r.number_id
   join public.companies co on co.id = r.company_id
   join public.profiles pr on pr.id = r.customer_id
   left join public.rejection_reasons rr on rr.id = r.reject_reason_id
   where r.id = p_req $$;

create function aman.block_reason(p_req uuid) returns text language plpgsql stable as $$
declare r public.operation_requests; u public.profiles; i jsonb;
begin
  select * into r from public.operation_requests where id = p_req;
  select * into u from public.profiles where id = r.customer_id;
  if r.operation_type = 'activation' and u.status <> 'active' then return 'الحساب معطّل — أعد تفعيله أولًا.'; end if;
  i := aman.elig(r.operation_type, r.number_id, r.customer_id);
  return i->>'message';
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'aman' loop
    execute format('alter function %s set search_path = public, aman, pg_temp', f.sig);
  end loop;
end $$;