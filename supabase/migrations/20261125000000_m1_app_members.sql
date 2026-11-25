-- M1 slice 1: invite-only membership (D-037, D-038, docs/ACCESS_CONTROL.md section 4).
-- Default deny: a new auth user is `pending` with a forced password change.

create table public.app_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  password_change_required boolean not null default true,
  display_name text,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  password_changed_at timestamptz,
  disabled_at timestamptz,
  disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.app_members is
  'Access approval per auth user. Owner-readable only; written by service_role / Dashboard / admin scripts.';

alter table public.app_members enable row level security;

-- A user may read ONLY their own row (even when pending) so the app knows which screen to show.
create policy app_members_select_own on public.app_members
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete for authenticated or anon: privileges are revoked, not just policies.
revoke all on public.app_members from anon, authenticated;
grant select on public.app_members to authenticated;

create trigger app_members_set_updated_at
  before update on public.app_members
  for each row execute function public.set_updated_at();

-- True only when the caller is an active member AND has replaced the initial password.
create function public.is_active_member() returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1
    from public.app_members m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.password_change_required = false
  );
$$;
revoke execute on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to authenticated;

-- Extend the signup trigger: every auth user gets a profile AND a pending membership.
create or replace function public.handle_new_user() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.app_members (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Backfill users that existed before M1: pending (default deny), never auto-active.
insert into public.app_members (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Learner data is owner-only AND requires an active member. profiles was M0: tighten it.
drop policy profiles_select_own on public.profiles;
drop policy profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id and (select public.is_active_member()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id and (select public.is_active_member()))
  with check ((select auth.uid()) = id and (select public.is_active_member()));

-- Trigger-based audit: admins edit in the Dashboard, so the DB must record it.
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_db_user text not null default current_user,
  actor_auth_uid uuid default auth.uid(),
  target_user_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb
);
alter table public.admin_audit_log enable row level security;
-- No policies: unreadable and unwritable for anon/authenticated. service_role bypasses RLS.
revoke all on public.admin_audit_log from anon, authenticated;
create index admin_audit_log_target_idx on public.admin_audit_log (target_user_id, occurred_at desc);

create function public.audit_app_members() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  cols text[] := array['role', 'status', 'password_change_required', 'approved_by', 'approved_at',
                       'password_changed_at', 'disabled_at', 'disabled_reason'];
  o jsonb;
  n jsonb;
begin
  if tg_op = 'INSERT' then
    n := (select jsonb_object_agg(k, to_jsonb(new) -> k) from unnest(cols) k);
  elsif tg_op = 'UPDATE' then
    o := (select jsonb_object_agg(k, to_jsonb(old) -> k) from unnest(cols) k);
    n := (select jsonb_object_agg(k, to_jsonb(new) -> k) from unnest(cols) k);
    if o = n then return new; end if;
  else
    o := (select jsonb_object_agg(k, to_jsonb(old) -> k) from unnest(cols) k);
  end if;
  insert into public.admin_audit_log (target_user_id, action, old_values, new_values)
  values (coalesce(new.user_id, old.user_id), lower(tg_op), o, n);
  return coalesce(new, old);
end;
$$;
revoke execute on function public.audit_app_members() from public, anon, authenticated;
create trigger app_members_audit
  after insert or update or delete on public.app_members
  for each row execute function public.audit_app_members();
