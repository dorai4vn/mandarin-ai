-- pgTAP: negative/positive authorization tests for profiles (architecture probe 5).
begin;
select plan(9);

-- Two users; the trigger must create their profiles.
insert into auth.users (id, email, aud, role)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@example.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@example.test', 'authenticated', 'authenticated');

select is((select count(*)::int from public.profiles), 2, 'signup trigger creates one profile per user');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS enabled on profiles');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'user A sees only own profile');
select is(
  (select count(*)::int from public.profiles where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  0,
  'user A cannot read user B profile even with a known id'
);

update public.profiles set display_name = 'hacked' where id = 'bbbbbbbb-0000-4000-8000-000000000002';
update public.profiles set display_name = 'Học viên A' where id = 'aaaaaaaa-0000-4000-8000-000000000001';

select throws_ok(
  $$ insert into public.profiles (id) values ('cccccccc-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'authenticated users cannot insert profiles directly'
);
select throws_ok(
  $$ update public.profiles set id = 'bbbbbbbb-0000-4000-8000-000000000002' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'authenticated users cannot change profile id'
);

-- Anonymous role has no access at all.
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');

-- Verify effects as superuser.
reset role;
select is(
  (select display_name from public.profiles where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  null,
  'user A update of user B profile had no effect'
);
select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'Học viên A',
  'user A can update own profile'
);

select * from finish();
rollback;
