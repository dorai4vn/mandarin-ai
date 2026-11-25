-- pgTAP: invite-only membership + is_active_member() (M1, docs/ACCESS_CONTROL.md section 11).
begin;
select plan(15);

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@example.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@example.test', 'authenticated', 'authenticated');

select is((select count(*)::int from public.app_members where status = 'pending' and password_change_required), 2,
  'new users default to pending + password_change_required');
select is((select count(*)::int from public.admin_audit_log where action = 'insert'), 2, 'inserts are audited');

-- Pending user: sees own membership row, no profile.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.app_members), 1, 'user reads only own membership row');
select is((select public.is_active_member()), false, 'pending is not an active member');
select is((select count(*)::int from public.profiles), 0, 'pending user gets no profile rows via RLS');
select throws_ok($$ update public.app_members set status = 'active' $$, '42501', null, 'user cannot self-approve');
select throws_ok($$ select * from public.admin_audit_log $$, '42501', null, 'user cannot read audit log');

-- Admin approves A but A still must change password.
reset role;
update public.app_members set status = 'active' where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select public.is_active_member()), false, 'active but password_change_required is still blocked');
select is((select count(*)::int from public.profiles), 0, 'no profile rows before password change');

-- Password changed: full access to own data only.
reset role;
update public.app_members set password_change_required = false, password_changed_at = now()
  where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select public.is_active_member()), true, 'active + password changed is a member');
select is((select count(*)::int from public.profiles), 1, 'member sees only own profile (not B)');

-- Disable: RLS blocks immediately.
reset role;
update public.app_members set status = 'disabled', disabled_at = now(), disabled_reason = 'test'
  where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 0, 'disabled member gets 0 rows immediately');

set local role anon;
select throws_ok($$ select * from public.app_members $$, '42501', null, 'anon cannot read app_members');

reset role;
select is((select count(*)::int from public.admin_audit_log where action = 'update'
  and target_user_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 3, 'status/password changes are audited');
select is((select new_values ->> 'status' from public.admin_audit_log
  where action = 'update' order by id desc limit 1), 'disabled', 'audit records new status');

select * from finish();
rollback;
