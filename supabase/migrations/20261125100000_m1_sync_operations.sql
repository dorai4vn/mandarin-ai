-- M1 (D-021, D-042): server log of offline outbox operations.
--  - Exactly once: operation_id is globally unique (client-generated UUID/ULID); replaying the same
--    operation is a no-op ("duplicate"). An id already used by ANOTHER user is "rejected" and the
--    caller learns nothing about that row (RLS hides it).
--  - Owner-only RLS: a user reads and inserts only their own rows; nobody updates or deletes
--    through the API (operations are immutable; rows go with the account via on delete cascade).
--  - Pull: rows are read in server_seq order. sync_push() serialises each user's pushes with an
--    advisory lock, so a user's server_seq values become visible in increasing order and a
--    "server_seq > cursor" pull never skips a row.
--  - The API calls PostgREST with the USER's JWT (never the secret key) for this table.

create table public.sync_operations (
  operation_id   text primary key check (operation_id ~ '^[0-9A-Za-z-]{16,64}$'),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  device_id      text not null check (char_length(device_id) between 8 and 64),
  entity_type    text not null check (entity_type ~ '^[a-z][a-z_]{1,40}$'),
  op_type        text not null check (op_type in ('create', 'update', 'delete', 'event')),
  schema_version integer not null check (schema_version > 0),
  logical_clock  bigint not null check (logical_clock >= 0),
  occurred_at    timestamptz not null,
  payload        jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16384),
  server_seq     bigint generated always as identity,
  received_at    timestamptz not null default now()
);

comment on table public.sync_operations is
  'Outbox operations per user (exactly once by operation_id). RLS: owner read/insert only.';

-- RLS predicate + pull order (D-032: every RLS predicate is indexed).
create unique index sync_operations_user_seq on public.sync_operations (user_id, server_seq);

alter table public.sync_operations enable row level security;

create policy sync_operations_select_own on public.sync_operations
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy sync_operations_insert_own on public.sync_operations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.sync_operations from public, anon, authenticated;
grant select on public.sync_operations to authenticated;
grant insert (operation_id, user_id, device_id, entity_type, op_type, schema_version,
              logical_clock, occurred_at, payload)
  on public.sync_operations to authenticated;

-- Batch push. SECURITY INVOKER: runs with the caller's role and RLS, so it can only ever write the
-- caller's own rows. Returns one result per input operation, in input order.
create function public.sync_push(ops jsonb)
  returns table (operation_id text, status text, server_seq bigint)
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  op jsonb;
  seq bigint;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(ops) <> 'array' or jsonb_array_length(ops) > 100 then
    raise exception 'ops must be an array of at most 100 operations' using errcode = '22023';
  end if;
  -- One push at a time per user (see header).
  perform pg_advisory_xact_lock(hashtextextended('sync_push:' || uid::text, 0));

  for op in select value from jsonb_array_elements(ops) loop
    seq := null;
    insert into public.sync_operations as s
      (operation_id, user_id, device_id, entity_type, op_type, schema_version,
       logical_clock, occurred_at, payload)
    values
      (op->>'operationId', uid, op->>'deviceId', op->>'entityType', op->>'opType',
       (op->>'schemaVersion')::integer, (op->>'logicalClock')::bigint,
       (op->>'occurredAt')::timestamptz, op->'payload')
    on conflict on constraint sync_operations_pkey do nothing
    returning s.server_seq into seq;

    if seq is not null then
      operation_id := op->>'operationId'; status := 'applied'; server_seq := seq;
    else
      -- Already stored: visible (RLS) only if it is the caller's own row.
      select s.server_seq into seq from public.sync_operations s
        where s.operation_id = op->>'operationId';
      operation_id := op->>'operationId';
      status := case when seq is null then 'rejected' else 'duplicate' end;
      server_seq := seq;
    end if;
    return next;
  end loop;
end;
$$;

revoke execute on function public.sync_push(jsonb) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;
