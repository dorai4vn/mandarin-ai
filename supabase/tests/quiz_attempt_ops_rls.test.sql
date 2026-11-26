-- pgTAP: quiz_attempt / learning_event operations (M3, D-042).
-- M3 has NO server-side quiz_attempts table yet (docs/ARCHITECTURE.md lists it for a later
-- milestone; no schema migration without owner approval). Attempts and events travel as
-- sync_operations rows, so the guarantees we can verify on the server today are: owner-only
-- isolation, exactly-once replay (same operation_id, also across separate pushes) and
-- immutability for the quiz entity types.
begin;
select plan(11);

insert into auth.users (id, email, aud, role)
values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', 'quiz-a@example.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-0000000000d2', 'quiz-b@example.test', 'authenticated', 'authenticated');

create temporary table quiz_ops as select
  jsonb_build_object('deviceId', 'device-quiz-1', 'entityType', 'quiz_attempt', 'opType', 'create',
    'schemaVersion', 1, 'logicalClock', 1, 'occurredAt', '2026-11-26T10:00:00Z',
    'operationId', 'op-quiz-attempt-aaaa-0001',
    'payload', jsonb_build_object('id', 'att-sess0001-1', 'sessionId', 'sess0001',
      'vocabularyItemId', 'vocab-0001-aaaa', 'skill', 'meaning', 'quizType', 'meaning_recognition',
      'quizTypeVersion', 1, 'correct', true, 'reason', 'match', 'studyDate', '2026-11-26',
      'responseMs', 900)) as attempt,
  jsonb_build_object('deviceId', 'device-quiz-1', 'entityType', 'learning_event', 'opType', 'event',
    'schemaVersion', 1, 'logicalClock', 2, 'occurredAt', '2026-11-26T10:00:00Z',
    'operationId', 'op-quiz-event-aaaa-0001',
    'payload', jsonb_build_object('id', 'att-sess0001-1:answered', 'eventType', 'quiz.answered',
      'eventVersion', 1, 'sessionId', 'sess0001', 'data', '{}'::jsonb)) as event;
grant select on quiz_ops to authenticated;

-- ── User A ────────────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-0000000000c1","role":"authenticated"}', true);

select is(
  (select array_agg(status order by operation_id) from public.sync_push(
     (select jsonb_build_array(attempt, event) from quiz_ops))),
  array['applied', 'applied'], 'A: attempt + event are applied');
select is(
  (select array_agg(status order by operation_id) from public.sync_push(
     (select jsonb_build_array(attempt, event) from quiz_ops))),
  array['duplicate', 'duplicate'], 'A: replaying the whole batch (retry after a lost response) is a duplicate');
select is(
  (select status from public.sync_push((select jsonb_build_array(attempt) from quiz_ops))),
  'duplicate', 'A: replaying a single attempt in a later push is a duplicate');
select is(
  (select count(*)::int from public.sync_operations where entity_type = 'quiz_attempt'),
  1, 'A: exactly one stored quiz_attempt after three pushes');
select is(
  (select count(*)::int from public.sync_operations where entity_type = 'learning_event'),
  1, 'A: exactly one stored learning_event after three pushes');
select throws_ok(
  $$ update public.sync_operations set payload = '{"correct":false}' where entity_type = 'quiz_attempt' $$,
  '42501', null, 'A cannot rewrite an attempt (immutable)');
select throws_ok(
  $$ delete from public.sync_operations where entity_type = 'quiz_attempt' $$,
  '42501', null, 'A cannot delete an attempt through the API');

-- ── User B ────────────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-0000000000d2","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.sync_operations where entity_type in ('quiz_attempt', 'learning_event')),
  0, 'B sees none of A''s attempts or events');
select is(
  (select status from public.sync_push((select jsonb_build_array(attempt) from quiz_ops))),
  'rejected', 'B replaying A''s operation id is rejected, not stored');
select is(
  (select count(*)::int from public.sync_operations where entity_type = 'quiz_attempt'),
  0, 'B still has no attempt rows after the rejected replay');

-- ── Anonymous ─────────────────────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$ select * from public.sync_operations where entity_type = 'quiz_attempt' $$,
  '42501', null, 'anon cannot read attempts');

select * from finish();
rollback;
