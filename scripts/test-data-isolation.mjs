#!/usr/bin/env node
/**
 * M1 (D-042) — data isolation and exactly-once sync against the LOCAL Supabase stack started by
 * `supabase start` (real GoTrue + PostgREST + Postgres with the repo's migrations), plus the real
 * API (`apps/api/dist/server.js`) pointed at it. No mock, no dev token.
 *
 * Proves:
 *   1. Two admin-created accounts sign in with e-mail + password (owner creates accounts; D-042).
 *   2. Through the API: push is applied once, replays are duplicates, B reusing A's id is rejected,
 *      pull returns only the caller's operations; no token → 401.
 *   3. Directly against PostgREST with the public publishable key (what an attacker has):
 *      B cannot read A's rows, cannot insert rows for A, cannot update/delete; anonymous callers
 *      read nothing and cannot call sync_push; B cannot read A's profile.
 *
 * Keys come from `supabase status` (local demo keys) and are never printed. Passwords are generated
 * per run and never printed.
 */
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';

function localStatus() {
  const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const json = JSON.parse(raw.slice(raw.indexOf('{')));
  const pick = (...names) => names.map((n) => json[n]).find(Boolean);
  const cfg = {
    api: pick('API_URL'),
    publishable: pick('PUBLISHABLE_KEY', 'ANON_KEY'),
    secret: pick('SECRET_KEY', 'SERVICE_ROLE_KEY'),
    serviceJwt: pick('SERVICE_ROLE_KEY'),
    jwtSecret: pick('JWT_SECRET'),
  };
  for (const k of ['api', 'publishable', 'secret']) {
    if (!cfg[k]) throw new Error(`supabase status: missing ${k}`);
  }
  return cfg;
}

const cfg = localStatus();
const results = [];
let failed = false;
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed = true;
};

async function request(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

const adminHeaders = () => {
  const h = { apikey: cfg.secret };
  if (cfg.serviceJwt?.startsWith('ey')) h.authorization = `Bearer ${cfg.serviceJwt}`;
  return h;
};
const userHeaders = (token) => ({ apikey: cfg.publishable, authorization: `Bearer ${token}` });
const anonHeaders = () => ({ apikey: cfg.publishable });

async function createAndSignIn(label) {
  const email = `${label}-${Date.now().toString(36)}@example.com`;
  const password = `Mk-${randomBytes(12).toString('base64url')}`;
  const created = await request(`${cfg.api}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(),
    body: { email, password, email_confirm: true },
  });
  if (created.status >= 300) throw new Error(`create ${label}: HTTP ${created.status}`);
  const login = await request(`${cfg.api}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: anonHeaders(),
    body: { email, password },
  });
  check(
    `${label}: admin-created account signs in with e-mail + password`,
    Boolean(login.json?.access_token),
  );
  return { id: created.json.id, token: login.json.access_token };
}

const op = (operationId, text) => ({
  operationId,
  deviceId: 'device-isolation-1',
  entityType: 'spike_note',
  opType: 'create',
  schemaVersion: 1,
  logicalClock: 1,
  occurredAt: new Date().toISOString(),
  payload: { text },
});

// ── Start the real API against the local stack ────────────────────────────────────────────────
const PORT = 8799;
const API = `http://127.0.0.1:${PORT}`;
const api = spawn('node', ['apps/api/dist/server.js'], {
  env: {
    ...process.env,
    NODE_ENV: 'development',
    APP_ENV: 'development',
    PORT: String(PORT),
    HOST: '127.0.0.1',
    SUPABASE_URL: cfg.api,
    SUPABASE_PUBLISHABLE_KEY: cfg.publishable,
    // Local GoTrue may sign with the legacy HS256 secret; the API verifies either way (D-036).
    ...(cfg.jwtSecret ? { SUPABASE_JWT_SECRET: cfg.jwtSecret } : {}),
    MISSING_PROVIDER_MODE: 'disabled',
    WEB_ORIGINS: 'http://localhost:3000',
  },
  stdio: ['ignore', 'ignore', 'inherit'],
});
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${API}/health`)).ok) break;
    } catch {
      /* not up yet */
    }
    if (i > 50) throw new Error('API did not start');
    await new Promise((r) => setTimeout(r, 200));
  }
  const health = await request(`${API}/health`);
  check(
    'API reports the LIVE sync store',
    health.json?.providers?.sync === 'live',
    health.json?.providers?.sync,
  );

  const A = await createAndSignIn('isolation-a');
  const B = await createAndSignIn('isolation-b');
  const idA = randomUUID();
  const idB = randomUUID();

  // ── Through the API ─────────────────────────────────────────────────────────────────────────
  const push = (who, ops) =>
    request(`${API}/v1/sync/push`, {
      method: 'POST',
      headers: { authorization: `Bearer ${who.token}` },
      body: { operations: ops },
    });
  const pull = (who, after = 0) =>
    request(`${API}/v1/sync/pull?after=${after}`, {
      headers: { authorization: `Bearer ${who.token}` },
    });

  const first = await push(A, [op(idA, 'A note')]);
  check(
    'API: first push is applied (live)',
    first.json?.results?.[0]?.status === 'applied' && first.json?.source === 'live',
  );
  const replay = await push(A, [op(idA, 'A note')]);
  check(
    'API: replay is a duplicate (exactly once)',
    replay.json?.results?.[0]?.status === 'duplicate',
  );
  const hijack = await push(B, [op(idA, 'B overwrites?')]);
  check(
    "API: B reusing A's operation id is rejected without revealing it",
    hijack.json?.results?.[0]?.status === 'rejected' &&
      hijack.json?.results?.[0]?.serverVersion === null,
  );
  await push(B, [op(idB, 'B note')]);
  const pa = await pull(A);
  check(
    "API: A pulls only A's operation",
    JSON.stringify(pa.json?.operations?.map((o) => o.operationId)) === JSON.stringify([idA]) &&
      pa.json?.operations?.[0]?.payload?.text === 'A note',
  );
  const pb = await pull(B);
  check(
    "API: B pulls only B's operation",
    JSON.stringify(pb.json?.operations?.map((o) => o.operationId)) === JSON.stringify([idB]),
  );
  const after = await pull(A, pa.json?.nextAfter ?? 0);
  check(
    'API: pull cursor advances (nothing new after nextAfter)',
    after.json?.operations?.length === 0,
  );
  const noToken = await request(`${API}/v1/sync/pull`);
  check('API: no token → 401', noToken.status === 401, `HTTP ${noToken.status}`);

  // ── Directly against PostgREST with the public key ───────────────────────────────────────────
  const rest = `${cfg.api}/rest/v1`;
  const readAsB = await request(`${rest}/sync_operations?operation_id=eq.${idA}`, {
    headers: userHeaders(B.token),
  });
  check(
    "REST: B cannot read A's row by id",
    readAsB.status === 200 && readAsB.json?.length === 0,
    `HTTP ${readAsB.status}`,
  );
  const allAsB = await request(`${rest}/sync_operations?select=operation_id`, {
    headers: userHeaders(B.token),
  });
  check(
    'REST: B sees only its own rows',
    allAsB.json?.length === 1 && allAsB.json[0].operation_id === idB,
  );
  const forged = await request(`${rest}/sync_operations`, {
    method: 'POST',
    headers: userHeaders(B.token),
    body: {
      operation_id: randomUUID(),
      user_id: A.id,
      device_id: 'device-isolation-1',
      entity_type: 'spike_note',
      op_type: 'create',
      schema_version: 1,
      logical_clock: 1,
      occurred_at: new Date().toISOString(),
      payload: {},
    },
  });
  check(
    'REST: B cannot insert a row owned by A',
    forged.status === 401 || forged.status === 403,
    `HTTP ${forged.status}`,
  );
  const upd = await request(`${rest}/sync_operations?operation_id=eq.${idB}`, {
    method: 'PATCH',
    headers: userHeaders(B.token),
    body: { payload: { text: 'changed' } },
  });
  check(
    'REST: operations cannot be updated',
    upd.status === 401 || upd.status === 403,
    `HTTP ${upd.status}`,
  );
  const del = await request(`${rest}/sync_operations?operation_id=eq.${idA}`, {
    method: 'DELETE',
    headers: userHeaders(B.token),
  });
  check(
    'REST: operations cannot be deleted',
    del.status === 401 || del.status === 403,
    `HTTP ${del.status}`,
  );
  const anonRead = await request(`${rest}/sync_operations?select=operation_id`, {
    headers: anonHeaders(),
  });
  check(
    'REST: anonymous caller reads nothing',
    anonRead.status === 401 ||
      anonRead.status === 403 ||
      (anonRead.status === 200 && anonRead.json?.length === 0),
    `HTTP ${anonRead.status}`,
  );
  const anonPush = await request(`${rest}/rpc/sync_push`, {
    method: 'POST',
    headers: anonHeaders(),
    body: { ops: [op(randomUUID(), 'anon')] },
  });
  check(
    'REST: anonymous caller cannot call sync_push',
    anonPush.status === 401 || anonPush.status === 403,
    `HTTP ${anonPush.status}`,
  );
  const profileAsB = await request(`${rest}/profiles?id=eq.${A.id}`, {
    headers: userHeaders(B.token),
  });
  check(
    "REST: B cannot read A's profile",
    profileAsB.status === 200 && profileAsB.json?.length === 0,
  );

  // A's data is still intact after B's attempts.
  const finalA = await pull(A);
  check(
    "A's operation unchanged after B's attempts",
    finalA.json?.operations?.length === 1 && finalA.json.operations[0].payload.text === 'A note',
  );
} finally {
  api.kill();
}

console.log(results.join('\n'));
if (failed) {
  console.error('test-data-isolation: FAILED');
  process.exit(1);
}
console.log(`test-data-isolation: OK (${results.length} checks)`);
