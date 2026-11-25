-- M1 slice 1 hardening: revoke tokens issued before a password change at the DB layer, and
-- record the real actor in the audit log.

-- is_active_member now also requires the JWT to be issued at/after the last password change, so an
-- old access token cannot read learner data straight through PostgREST (bypassing the API gate).
create or replace function public.is_active_member() returns boolean
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
      and (
        m.password_changed_at is null
        or coalesce(((select auth.jwt()) ->> 'iat')::bigint, 0)
             >= floor(extract(epoch from m.password_changed_at))::bigint
      )
  );
$$;
revoke execute on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to authenticated;

-- Inside SECURITY DEFINER, current_user is the function owner; session_user is the connecting role.
alter table public.admin_audit_log alter column actor_db_user set default session_user;

create or replace function public.audit_app_members() returns trigger
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
  insert into public.admin_audit_log (actor_db_user, actor_auth_uid, target_user_id, action, old_values, new_values)
  values (session_user, (select auth.uid()), coalesce(new.user_id, old.user_id), lower(tg_op), o, n);
  return coalesce(new, old);
end;
$$;
revoke execute on function public.audit_app_members() from public, anon, authenticated;
