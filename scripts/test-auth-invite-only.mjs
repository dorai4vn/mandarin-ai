#!/usr/bin/env node
/**
 * D-037 — real Auth check against the LOCAL Supabase stack (GoTrue + Kong + Mailpit) started by
 * `supabase start`, using supabase/config.toml (enable_signup = false). No dev token, no mock:
 * every request goes to the real Auth server. Run in CI (database job) or locally after
 * `pnpm exec supabase start`.
 *
 * Proves:
 *   1. Public e-mail/password sign-up with the publishable key is rejected.
 *   2. Anonymous sign-in is rejected.
 *   3. OTP for an unknown e-mail (create_user true or false) creates no account and sends no mail.
 *   4. An account created by an admin (secret key) can request a code, receives it by e-mail and
 *      can verify it → gets an `authenticated` access token.
 *
 * Keys are read from `supabase status` (local demo keys) and never printed.
 */
import { execFileSync } from 'node:child_process';

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
    mail: pick('MAILPIT_URL', 'INBUCKET_URL'),
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

async function auth(path, body, { admin = false, method = 'POST' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (admin) {
    headers.apikey = cfg.secret;
    // Legacy JWT service key also goes in Authorization; new sb_secret_ keys are apikey-only.
    if (cfg.serviceJwt?.startsWith('ey')) headers.authorization = `Bearer ${cfg.serviceJwt}`;
  } else {
    headers.apikey = cfg.publishable;
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

async function mailsTo(email) {
  const q = encodeURIComponent(`to:"${email}"`);
  const res = await fetch(`${cfg.mail}/api/v1/search?query=${q}`);
  if (!res.ok) throw new Error(`mailpit search failed: HTTP ${res.status}`);
  return (await res.json()).messages ?? [];
}

async function waitForCode(email) {
  for (let i = 0; i < 20; i++) {
    const [first] = await mailsTo(email);
    if (first) {
      const msg = await (await fetch(`${cfg.mail}/api/v1/message/${first.ID}`)).json();
      const code = /\b(\d{6})\b/.exec(`${msg.Text ?? ''} ${msg.HTML ?? ''}`)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

const run = Date.now().toString(36);
const stranger = `nguoi-la-${run}@example.com`;
const stranger2 = `nguoi-la-2-${run}@example.com`;
const usersBefore = (await listUserEmails()).length;

// 1. Public sign-up is closed.
const signup = await auth('/signup', { email: stranger, password: 'Mat-khau-dai-123456!' });
check(
  'POST /signup (email + password, publishable key) is rejected',
  signup.status >= 400 && signup.status < 500 && !signup.json.access_token,
  `HTTP ${signup.status} ${signup.json.error_code ?? signup.json.msg ?? ''}`.trim(),
);

// 2. Anonymous sign-in is closed (empty sign-up body = anonymous user).
const anon = await auth('/signup', { data: {} });
check(
  'anonymous sign-in is rejected',
  anon.status >= 400 && anon.status < 500 && !anon.json.access_token,
  `HTTP ${anon.status} ${anon.json.error_code ?? anon.json.msg ?? ''}`.trim(),
);

// 3. OTP for unknown e-mails never creates a user.
const otpCreate = await auth('/otp', { email: stranger, create_user: true });
check(
  'OTP create_user=true for unknown e-mail is rejected (signup disabled)',
  otpCreate.status >= 400 && otpCreate.status < 500,
  `HTTP ${otpCreate.status} ${otpCreate.json.error_code ?? otpCreate.json.msg ?? ''}`.trim(),
);
const otpNoCreate = await auth('/otp', { email: stranger2, create_user: false });
check(
  'OTP create_user=false (what the app sends) for unknown e-mail is not a server error',
  otpNoCreate.status < 500,
  `HTTP ${otpNoCreate.status} ${otpNoCreate.json.error_code ?? otpNoCreate.json.msg ?? ''}`.trim(),
);
const emailsAfter = await listUserEmails();
check(
  'no account was created for unknown e-mails',
  !emailsAfter.includes(stranger) &&
    !emailsAfter.includes(stranger2) &&
    emailsAfter.length === usersBefore,
  `users before=${usersBefore} after=${emailsAfter.length}`,
);
check(
  'no e-mail was sent to unknown addresses',
  (await mailsTo(stranger)).length === 0 && (await mailsTo(stranger2)).length === 0,
);

// 4. An admin-invited account can sign in with a code.
const invited = `duoc-moi-${run}@example.com`;
const created = await auth(
  '/admin/users',
  { email: invited, email_confirm: true },
  { admin: true },
);
check('admin (secret key) can create an account', created.status === 200, `HTTP ${created.status}`);
const otpInvited = await auth('/otp', { email: invited, create_user: false });
check('invited account can request a code', otpInvited.status === 200, `HTTP ${otpInvited.status}`);
const code = await waitForCode(invited);
check('code e-mail arrives (Mailpit)', Boolean(code));
if (code) {
  const verify = await auth('/verify', { type: 'email', email: invited, token: code });
  const payload = verify.json.access_token
    ? JSON.parse(Buffer.from(verify.json.access_token.split('.')[1], 'base64url').toString())
    : {};
  check(
    'code verifies → authenticated session (not anonymous)',
    verify.status === 200 &&
      payload.role === 'authenticated' &&
      payload.aud === 'authenticated' &&
      payload.is_anonymous !== true,
    `HTTP ${verify.status}`,
  );
}
const finalEmails = await listUserEmails();
check(
  'only the invited account was added',
  finalEmails.length === usersBefore + 1 && finalEmails.includes(invited),
  `users before=${usersBefore} after=${finalEmails.length}`,
);

console.log('Auth invite-only check (real local GoTrue, D-037):');
for (const line of results) console.log(`  ${line}`);
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log(`All ${results.length} checks passed.`);
