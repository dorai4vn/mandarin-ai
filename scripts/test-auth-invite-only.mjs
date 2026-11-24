#!/usr/bin/env node
/**
 * D-038 / D-037 — real Auth check against the LOCAL Supabase stack (GoTrue + Kong) started by
 * `supabase start`, using supabase/config.toml (enable_signup = false, anonymous off,
 * minimum_password_length = 12). No dev token, no mock and no e-mail: every request goes to the
 * real Auth server, and the CI job runs WITHOUT Mailpit to prove sign-in needs no SMTP.
 *
 * Proves:
 *   1. Public e-mail/password sign-up with the publishable key is rejected.
 *   2. Anonymous sign-in is rejected.
 *   3. An account created by an admin (secret key) with a password signs in → `authenticated` JWT.
 *   4. Wrong password and an e-mail that was never granted access get the SAME error and create
 *      no account.
 *   5. A password shorter than 12 characters cannot be set.
 *
 * Keys come from `supabase status` (local demo keys) and are never printed. Passwords are
 * generated per run and never printed.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

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
  };
  for (const [k, v] of Object.entries(cfg)) {
    if (!v && k !== 'serviceJwt') throw new Error(`supabase status: missing ${k}`);
  }
  return cfg;
}

const cfg = localStatus();
const results = [];
let failed = false;

function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed = true;
}

const describe = (r) => `HTTP ${r.status} ${r.json.error_code ?? ''}`.trim();

async function auth(path, body, { admin = false, method = 'POST', bearer } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (admin) {
    headers.apikey = cfg.secret;
    // Legacy JWT service key also goes in Authorization; new sb_secret_ keys are apikey-only.
    if (cfg.serviceJwt?.startsWith('ey')) headers.authorization = `Bearer ${cfg.serviceJwt}`;
  } else {
    headers.apikey = cfg.publishable;
    if (bearer) headers.authorization = `Bearer ${bearer}`;
  }
  const res = await fetch(`${cfg.api}/auth/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

async function listUserEmails() {
  const { status, json } = await auth('/admin/users?per_page=1000', undefined, {
    admin: true,
    method: 'GET',
  });
  if (status !== 200) throw new Error(`admin list users failed: HTTP ${status}`);
  return (json.users ?? []).map((u) => u.email);
}

const passwordLogin = (email, password) => auth('/token?grant_type=password', { email, password });

const jwtPayload = (token) =>
  token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) : {};

const run = Date.now().toString(36);
const newPassword = () => `Mk-${randomBytes(12).toString('base64url')}`; // ≥ 19 chars
const stranger = `chua-duoc-cap-${run}@example.com`;
const usersBefore = (await listUserEmails()).length;

// 1. Public sign-up is closed.
const signup = await auth('/signup', { email: stranger, password: newPassword() });
check(
  'POST /signup (email + password, publishable key) is rejected',
  signup.status >= 400 && signup.status < 500 && !signup.json.access_token,
  describe(signup),
);

// 2. Anonymous sign-in is closed (sign-up without credentials = anonymous user).
const anon = await auth('/signup', { data: {} });
check(
  'anonymous sign-in is rejected',
  anon.status >= 400 && anon.status < 500 && !anon.json.access_token,
  describe(anon),
);

// 3. Admin-created account signs in with its password.
const member = `duoc-cap-${run}@example.com`;
const memberPassword = newPassword();
const created = await auth(
  '/admin/users',
  { email: member, password: memberPassword, email_confirm: true },
  { admin: true },
);
check(
  'admin (secret key) creates an account with a password',
  created.status === 200,
  describe(created),
);
const ok = await passwordLogin(member, memberPassword);
const payload = jwtPayload(ok.json.access_token);
check(
  'correct password → authenticated session (not anonymous)',
  ok.status === 200 &&
    payload.role === 'authenticated' &&
    payload.aud === 'authenticated' &&
    payload.sub === created.json.id &&
    payload.is_anonymous !== true,
  describe(ok),
);

// 4. Wrong password and unknown e-mail are indistinguishable.
const wrong = await passwordLogin(member, newPassword());
const unknown = await passwordLogin(stranger, newPassword());
check(
  'wrong password is rejected',
  wrong.status === 400 && !wrong.json.access_token,
  describe(wrong),
);
check(
  'e-mail never granted access is rejected',
  unknown.status === 400 && !unknown.json.access_token,
  describe(unknown),
);
check(
  'wrong password and unknown e-mail return the same error (no account enumeration)',
  wrong.status === unknown.status &&
    wrong.json.error_code === unknown.json.error_code &&
    wrong.json.msg === unknown.json.msg,
  `${describe(wrong)} vs ${describe(unknown)}`,
);

// 5. Password policy: fewer than 12 characters cannot be set.
const short = await auth(
  '/user',
  { password: 'Ngan-11-kt!' },
  { method: 'PUT', bearer: ok.json.access_token },
);
check('a password shorter than 12 characters is refused', short.status === 422, describe(short));
const stillOld = await passwordLogin(member, memberPassword);
check(
  'the refused change left the old password in place',
  stillOld.status === 200,
  describe(stillOld),
);

const finalEmails = await listUserEmails();
check(
  'only the admin-created account exists (no account from sign-up / login attempts)',
  finalEmails.length === usersBefore + 1 &&
    finalEmails.includes(member) &&
    !finalEmails.includes(stranger),
  `users before=${usersBefore} after=${finalEmails.length}`,
);

console.log('Auth invite-only check (real local GoTrue, e-mail + password, D-038):');
for (const line of results) console.log(`  ${line}`);
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log(`All ${results.length} checks passed.`);
