-- pgTAP: shared content is read-only for learners and invisible to anonymous callers (M2, D-001).
begin;
select plan(13);

insert into auth.users (id, email, aud, role)
values ('cccccccc-0000-4000-8000-0000000000c3', 'content-c@example.test', 'authenticated', 'authenticated');

select ok((select count(*) > 0 from public.lexemes), 'starter lexicon is seeded');
select is((select count(*)::int from public.lexemes where simplified = '天'), 1,
  'a word used by two lessons is one shared lexeme');
select is((select count(*)::int from public.lesson_lexemes where lexeme_id = 'lx-tian'), 2,
  'its lesson occurrences stay separate');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-0000000000c3","role":"authenticated"}', true);

select ok((select count(*) > 0 from public.lexemes), 'a learner can read the lexicon');
select ok((select count(*) > 0 from public.lessons), 'a learner can read lessons');
select ok((select version is not null from public.content_version), 'content version is readable');
select throws_ok($$ update public.lexemes set meaning_vi = 'hacked' where id = 'lx-shan' $$,
  '42501', null, 'a learner cannot modify the shared lexicon');
select throws_ok($$ insert into public.lexemes (id, simplified, pinyin, meaning_vi) values ('lx-x', 'x', 'x', 'x') $$,
  '42501', null, 'a learner cannot add shared lexemes');
select throws_ok($$ delete from public.lexemes $$, '42501', null, 'a learner cannot delete shared lexemes');
select throws_ok($$ update public.courses set title = 'x' $$, '42501', null, 'a learner cannot modify courses');
select throws_ok($$ insert into public.lesson_lexemes (lesson_id, lexeme_id, ordinal) values ('ls-1-1', 'lx-shan', 99) $$,
  '42501', null, 'a learner cannot change lesson contents');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select * from public.lexemes $$, '42501', null, 'anon cannot read the lexicon');

reset role;
select is((select meaning_vi from public.lexemes where id = 'lx-shan'), 'núi', 'shared lexicon unchanged');

select * from finish();
rollback;
