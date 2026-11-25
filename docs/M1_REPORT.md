# M1 — Progress report (issue #19)

Status labels: VERIFIED = real evidence; NOT DONE = not started. Nothing here touches Production.

## Slice 1 (this PR): membership schema + API gate — VERIFIED locally
- Migration `20261125000000_m1_app_members.sql`: `app_members` (pending default via signup trigger, backfill = pending), `is_active_member()`, trigger-based `admin_audit_log`, `profiles` RLS now requires an active member. Revoked write privileges for anon/authenticated.
- API: membership gate in `requireUser` (403 `not_a_member`, 401 `session_revoked`, 403 `password_change_required`, 503 fail-closed on lookup error), 60 s max cache, `GET /v1/me`.
- Evidence: `supabase test db` (local Postgres, pgTAP) 24/24 pass; `apps/api` typecheck, lint, vitest 49/49 pass.

## NOT DONE yet (next PRs, in order)
1. `POST /v1/me/password` (ACCESS_CONTROL §6) + log redaction + simulated-failure tests; GoTrue-backed integration test (old tokens rejected).
2. Admin scripts (temp password, disable/ban, re-enable) + runbook update.
3. Cookie-based session (AUTH_SESSION_DESIGN.md), logout clearing IndexedDB/caches, web forced-password-change screen.
4. A/B cross-user integration tests for new learner tables; `sync_operations` Postgres table + real store (replaces in-memory mock).
5. IndexedDB read store + outbox, exactly-once sync, `rejected` status (G1), lazy Supabase SDK (G2).
6. Performance CI gates (lab benchmark, route JS budget), instrumentation, region measurement, Preview baseline.
7. Real-device / multi-device smoke: **UNVERIFIED** — no device evidence exists.
Note: the server must be configured with `SUPABASE_URL` + `SUPABASE_SECRET_KEY` or it refuses to start (fail closed); check Railway env before any deploy (owner action).
