-- AMAN.C / Supabase PostgreSQL foundation
-- Source of truth: AMAN.Y feature/aman-simplified-v2, admin reference v1.0 rev.5
-- This migration creates the data model and deny-by-default RLS baseline.
-- Business mutations are intentionally deferred to audited SECURITY DEFINER RPCs.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.account_role as enum ('customer', 'admin');
create type public.account_status as enum ('active', 'disabled');
create type public.operation_type as enum ('activation', 'extension', 'reactivation');
create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.task_status as enum ('planned', 'due', 'executed');
create type public.protection_event_type as enum ('activation', 'extension', 'reactivation', 'admin_terminated');
create type public.report_reason_code as enum ('mine', 'lost_access', 'unauthorized', 'other');
create type public.report_decision as enum ('no_action', 'protection_terminated');
create type public.message_source as enum ('auto', 'manual');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role public.account_role not null default 'customer',
  full_name text,
  email text,
  status public.account_status not null default 'active',
  disabled_at timestamptz,
  disabled_by uuid references public.profiles(id) on delete restrict,
  disabled_reason text,
  created_at timestamptz not null default now(),
  constraint profiles_disabled_fields_check check (
    (status = 'active' and disabled_at is null)
    or (status = 'disabled' and disabled_at is not null)
  )
);

create unique index profiles_single_admin_idx on public.profiles ((role)) where role = 'admin';

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_prefixes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  prefix text not null unique,
  lengths integer[] not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint company_prefixes_digits check (prefix ~ '^[0-9]+$'),
  constraint company_prefixes_lengths check (
    cardinality(lengths) > 0 and 0 < all(lengths)
  )
);

create table public.numbers (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  company_id uuid not null references public.companies(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint numbers_local_digits check (number ~ '^[0-9]+$')
);

create table public.number_links (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  added_at timestamptz not null default now(),
  unique (number_id, customer_id)
);

create table public.protection_packages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  operation_type public.operation_type not null,
  name text not null,
  days integer not null check (days > 0),
  price_yer integer not null check (price_yer > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index protection_packages_lookup_idx
  on public.protection_packages(company_id, operation_type, active);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  instructions text not null,
  reference_required boolean not null default true,
  reference_pattern text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rejection_reasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.protections (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  terminated_at timestamptz,
  terminated_by uuid references public.profiles(id) on delete restrict,
  terminate_report_id uuid,
  package_name text not null,
  total_days integer not null check (total_days > 0),
  source_request_id uuid,
  created_at timestamptz not null default now(),
  constraint protections_period_check check (ends_at > starts_at),
  constraint protections_termination_check check (
    terminated_at is null or terminated_at >= starts_at
  )
);
create index protections_number_period_idx on public.protections(number_id, starts_at desc, ends_at desc);
create index protections_customer_period_idx on public.protections(customer_id, starts_at desc);

create table public.operation_requests (
  id uuid primary key default gen_random_uuid(),
  request_no bigint generated always as identity unique,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  number_id uuid not null references public.numbers(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  operation_type public.operation_type not null,
  package_id uuid references public.protection_packages(id) on delete set null,
  package_snapshot jsonb not null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  payment_method_snapshot jsonb not null,
  payment_reference text,
  status public.request_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reject_reason_id uuid references public.rejection_reasons(id) on delete restrict,
  reject_reason_note text,
  idempotency_key uuid not null,
  protection_id uuid references public.protections(id) on delete restrict,
  constraint operation_request_snapshot_object check (
    jsonb_typeof(package_snapshot) = 'object'
    and jsonb_typeof(payment_method_snapshot) = 'object'
  ),
  constraint operation_request_review_fields check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null and reject_reason_id is null)
    or (status = 'approved' and reviewed_at is not null and reviewed_by is not null and reject_reason_id is null and protection_id is not null)
    or (status = 'rejected' and reviewed_at is not null and reviewed_by is not null and reject_reason_id is not null and protection_id is null)
  ),
  unique (customer_id, idempotency_key)
);
create index operation_requests_customer_idx on public.operation_requests(customer_id, submitted_at desc);
create index operation_requests_review_idx on public.operation_requests(status, submitted_at);
create index operation_requests_number_idx on public.operation_requests(number_id, status);

alter table public.protections
  add constraint protections_source_request_fk
  foreign key (source_request_id) references public.operation_requests(id) on delete restrict;

create table public.protection_events (
  id uuid primary key default gen_random_uuid(),
  protection_id uuid not null references public.protections(id) on delete restrict,
  event_type public.protection_event_type not null,
  request_id uuid references public.operation_requests(id) on delete restrict,
  report_id uuid,
  added_days integer not null default 0,
  at timestamptz not null default now(),
  constraint protection_events_added_days check (added_days >= 0)
);

create table public.company_task_settings (
  company_id uuid primary key references public.companies(id) on delete restrict,
  create_first_on_activation boolean not null default false,
  interval_days integer not null check (interval_days > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict
);

-- company_id NULL represents a system-wide setting; a non-NULL value represents
-- a company-specific override. The final scope/precedence remains an explicit
-- product decision and must be resolved before operational RPCs are enabled.
create table public.reactivation_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  allow_reactivation boolean not null,
  reactivation_grace_days integer not null check (reactivation_grace_days >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict
);
create unique index reactivation_settings_scope_idx
  on public.reactivation_settings ((coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid)));

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  protection_id uuid not null references public.protections(id) on delete restrict,
  number_id uuid not null references public.numbers(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  seq integer not null check (seq > 0),
  due_at timestamptz not null,
  status public.task_status not null default 'planned',
  executed_at timestamptz,
  executed_by uuid references public.profiles(id) on delete restrict,
  note text,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (protection_id, seq),
  constraint tasks_execution_fields check (
    (status = 'executed' and executed_at is not null and executed_by is not null)
    or (status <> 'executed' and executed_at is null and executed_by is null)
  )
);
create index tasks_due_idx on public.tasks(status, due_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  number_id uuid not null references public.numbers(id) on delete restrict,
  reason_code public.report_reason_code not null,
  reason_text text,
  created_at timestamptz not null default now(),
  constraint reports_other_reason_text check (
    reason_code <> 'other' or nullif(btrim(reason_text), '') is not null
  )
);

create table public.report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  decision public.report_decision not null,
  reason_text text not null check (length(btrim(reason_text)) > 0),
  protection_id uuid references public.protections(id) on delete restrict,
  decided_by uuid not null references public.profiles(id) on delete restrict,
  decided_at timestamptz not null default now(),
  constraint report_action_protection_check check (
    (decision = 'protection_terminated' and protection_id is not null)
    or (decision = 'no_action' and protection_id is null)
  )
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  source public.message_source not null,
  source_event text,
  created_by uuid references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  delivery_status text not null default 'delivered' check (delivery_status in ('delivered','read')),
  channel text not null default 'in_app' check (channel = 'in_app'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  broadcast_id uuid,
  constraint notifications_source_actor check (
    (source = 'auto' and created_by is null)
    or (source = 'manual' and created_by is not null)
  )
);
create index notifications_customer_idx on public.notifications(customer_id, created_at desc);

create table public.number_alerts (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  source public.message_source not null,
  source_event text,
  created_by uuid references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint number_alerts_source_actor check (
    (source = 'auto' and created_by is null)
    or (source = 'manual' and created_by is not null)
  ),
  foreign key (number_id, customer_id) references public.number_links(number_id, customer_id) on delete restrict
);
create index number_alerts_customer_idx on public.number_alerts(customer_id, created_at desc);

create table public.app_content (
  key text primary key check (key in ('terms','privacy','contact','help')),
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text,
  result text not null,
  summary text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log(created_at desc);

-- Profile creation never accepts a client-supplied role or account status.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, role, email, status)
  values (new.id, 'customer', new.email, 'active');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS is enabled now. No broad table policies are created in this foundation.
-- This intentionally blocks direct client access until reviewed RPCs and
-- narrowly-scoped read policies are added in the next migration.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','companies','company_prefixes','numbers','number_links',
    'protection_packages','payment_methods','rejection_reasons',
    'operation_requests','protections','protection_events',
    'company_task_settings','reactivation_settings','tasks','reports',
    'report_actions','notifications','number_alerts','app_content','audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Minimal profile self-read only. All profile writes and role changes remain server-controlled.
create policy profiles_select_self
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;

comment on schema public is 'AMAN.C production schema; business access must be exposed through reviewed RLS policies and transactional RPCs.';
