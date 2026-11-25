-- pgTAP: sync_operations isolation and exactly-once semantics (M1, D-042).
begin;
select plan(17);

insert into auth.users (id, email, aud, role)
values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'sync-a@example.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'sync-b@example.test', 'authenticated', 'authenticated');

select ok((select relrowsecurity from pg_class where oid = 'public.sync_operations'::regclass),
  'RLS enabled on sync_operations');

create temporary table op_template as select
  '{"deviceId":"device-aaaa-1","entityType":"spike_note","opType":"create","schemaVersion":1,
    "logicalClock":1,"occurredAt":"2026-11-25T10:00:00Z","payload":{"text":"山 = núi"}}'::jsonb as base;
grant select on op_template to authenticated, anon;

-- ── User A ────────────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

select is(
  (select status from public.sync_push(jsonb_build_array(
     (select base || '{"operationId":"op-aaaaaaaaaaaaaaaa-0001"}' from op_template)))),
  'applied', 'A: first push is applied');
select is(
  (select status from public.sync_push(jsonb_build_array(
     (select base || '{"operationId":"op-aaaaaaaaaaaaaaaa-0001"}' from op_template)))),
  'duplicate', 'A: same operation again is a duplicate (exactly once)');
select is((select count(*)::int from public.sync_operations), 1, 'A: one stored row after the replay');
select is(
  (select array_agg(status order by operation_id) from public.sync_push(jsonb_build_array(
     (select base || '{"operationId":"op-aaaaaaaaaaaaaaaa-0002"}' from op_template),
     (select base || '{"operationId":"op-aaaaaaaaaaaaaaaa-0002"}' from op_template)))),
  array['applied', 'duplicate'], 'A: a duplicate inside one batch is detected');

select throws_ok(
  $$ insert into public.sync_operations (operation_id, user_id, device_id, entity_type, op_type,
       schema_version, logical_clock, occurred_at, payload)
     values ('op-forged-for-b-000001', 'bbbbbbbb-0000-4000-8000-0000000000b2', 'device-aaaa-1',
       'spike_note', 'create', 1, 1, now(), '{}') $$,
  '42501', null, 'A cannot insert a row owned by B');
select throws_ok(
  $$ update public.sync_operations set payload = '{"x":1}' $$,
  '42501', null, 'operations are immutable (no UPDATE privilege)');
select throws_ok(
  $$ delete from public.sync_operations $$,
  '42501', null, 'no DELETE privilege');
select throws_ok(
  $$ insert into public.sync_operations (operation_id, device_id, entity_type, op_type,
       schema_version, logical_clock, occurred_at, payload, server_seq)
     values ('op-aaaaaaaaaaaaaaaa-0009', 'device-aaaa-1', 'spike_note', 'create', 1, 1, now(), '{}', 1) $$,
  '428C9', null, 'server_seq cannot be chosen by the client (identity GENERATED ALWAYS)');

-- ── User B ────────────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

select is((select count(*)::int from public.sync_operations), 0, 'B sees none of A''s operations');
select is(
  (select count(*)::int from public.sync_operations where operation_id = 'op-aaaaaaaaaaaaaaaa-0001'),
  0, 'B cannot read A''s operation even by id');
select is(
  (select status from public.sync_push(jsonb_build_array(
     (select base || '{"operationId":"op-aaaaaaaaaaaaaaaa-0001","payload":{"text":"hijack"}}' from op_template)))),
  'rejected', 'B reusing A''s operation id is rejected');
select is(
  (select server_seq from public.sync_push(jsonb_build_array(
     (select base || '{"operationId":"op-aaaaaaaaaaaaaaaa-0001"}' from op_template)))),
  null, 'the rejection reveals no server_seq of A''s row');
select is(
  (select status from public.sync_push(jsonb_build_array(
     (select base || '{"operationId":"op-bbbbbbbbbbbbbbbb-0001"}' from op_template)))),
  'applied', 'B can push its own operations');
select is((select count(*)::int from public.sync_operations), 1, 'B sees only its own operation');

-- ── Anonymous ─────────────────────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select * from public.sync_operations $$, '42501', null, 'anon cannot read');
select throws_ok(
  $$ select * from public.sync_push('[]'::jsonb) $$, '42501', null, 'anon cannot call sync_push');

select * from finish();
rollback;
