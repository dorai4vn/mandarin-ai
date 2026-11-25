-- M2 (D-001, D-012, D-043): shared, read-only learning content.
--  - lexemes: the canonical shared lexicon (one row per word + reading + meaning).
--  - courses → chapters → lessons; lesson_lexemes links lessons to lexemes (a word used by several
--    lessons is ONE lexeme; occurrences stay separate rows).
--  - Learners (authenticated) can only SELECT. Nobody writes through the API: content changes by
--    reviewed migrations / the SQL editor (owner) or a future import pipeline (service_role).
--  - Personal vocabulary is NOT stored here: it is the learner's own sync_operations (D-043).

create table public.lexemes (
  id          text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  simplified  text not null check (char_length(simplified) between 1 and 32),
  traditional text check (char_length(traditional) <= 32),
  pinyin      text not null check (char_length(pinyin) between 1 and 80),
  meaning_vi  text not null check (char_length(meaning_vi) between 1 and 300),
  example     text check (char_length(example) <= 300),
  example_vi  text check (char_length(example_vi) <= 300),
  updated_at  timestamptz not null default now(),
  unique (simplified, pinyin, meaning_vi)
);

create table public.courses (
  id          text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  title       text not null check (char_length(title) between 1 and 200),
  level       text not null default '' check (char_length(level) <= 40),
  description text not null default '' check (char_length(description) <= 1000),
  provenance  text not null check (char_length(provenance) between 1 and 500),
  published   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table public.chapters (
  id         text primary key check (id ~ '^[a-z0-9-]{2,64}$'),
  course_id  text not null references public.courses (id) on delete cascade,
  ordinal    integer not null check (ordinal >= 0),
  title      text not null check (char_length(title) between 1 and 200),
  updated_at timestamptz not null default now(),
  unique (course_id, ordinal)
);

create table public.lessons (
  id         text primary key check (id ~ '^[a-z0-9-]{2,64}$'),
  chapter_id text not null references public.chapters (id) on delete cascade,
  ordinal    integer not null check (ordinal >= 0),
  title      text not null check (char_length(title) between 1 and 200),
  updated_at timestamptz not null default now(),
  unique (chapter_id, ordinal)
);

create table public.lesson_lexemes (
  lesson_id  text not null references public.lessons (id) on delete cascade,
  lexeme_id  text not null references public.lexemes (id) on delete restrict,
  ordinal    integer not null check (ordinal >= 0),
  updated_at timestamptz not null default now(),
  primary key (lesson_id, lexeme_id),
  unique (lesson_id, ordinal)
);

-- FK indexes (D-032).
create index chapters_course on public.chapters (course_id);
create index lessons_chapter on public.lessons (chapter_id);
create index lesson_lexemes_lexeme on public.lesson_lexemes (lexeme_id);

-- Read-only for signed-in learners; nothing for anonymous callers.
do $$
declare t text;
begin
  foreach t in array array['lexemes', 'courses', 'chapters', 'lessons', 'lesson_lexemes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;

create policy lexemes_read on public.lexemes for select to authenticated using (true);
create policy courses_read on public.courses for select to authenticated using (published);
create policy chapters_read on public.chapters for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.published));
create policy lessons_read on public.lessons for select to authenticated
  using (exists (select 1 from public.chapters ch join public.courses c on c.id = ch.course_id
                 where ch.id = chapter_id and c.published));
create policy lesson_lexemes_read on public.lesson_lexemes for select to authenticated using (true);

-- Content version: changes whenever any row changes (or rows are added/removed). The app
-- re-downloads the snapshot only when it differs.
create view public.content_version with (security_invoker = true) as
select md5(concat_ws('|',
  (select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.lexemes),
  (select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.courses),
  (select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.chapters),
  (select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.lessons),
  (select count(*) || ':' || coalesce(max(updated_at)::text, '') from public.lesson_lexemes)
)) as version;

revoke all on public.content_version from public, anon, authenticated;
grant select on public.content_version to authenticated;
