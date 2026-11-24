#!/usr/bin/env node
// Lightweight guard against committing credentials. Scans tracked files for common key
// formats and for real .env files. Not a replacement for GitHub secret scanning.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const PATTERNS = [
  [/sk-(?:proj-)?[A-Za-z0-9_-]{20,}/, 'OpenAI API key'],
  [
    /eyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    'JWT (e.g. Supabase key)',
  ],
  [/sb_secret_[A-Za-z0-9_-]{16,}/, 'Supabase secret key'],
  [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, 'private key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
];
const problems = [];
for (const f of files) {
  if (/(^|\/)\.env($|\.)/.test(f) && !f.endsWith('.env.example'))
    problems.push(`${f}: real env file is tracked`);
  if (/pnpm-lock\.yaml$|\.(png|jpg|jpeg|gif|pdf|ttf|otf)$/.test(f)) continue;
  let text;
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  for (const [re, label] of PATTERNS) if (re.test(text)) problems.push(`${f}: looks like ${label}`);
}
if (problems.length) {
  console.error(
    'check-secrets: possible secrets found\n' + problems.map((p) => ` - ${p}`).join('\n'),
  );
  process.exit(1);
}
console.info(`check-secrets: OK (${files.length} tracked files scanned)`);
