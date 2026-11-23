# Mandarin AI — Claude Code Execution Plan v1.3

> v1.3 aligns milestones with owner decisions D-001 … D-013 in `docs/DECISIONS.md`.

This plan prioritizes a real iOS application, audited architecture, and real data operations. The HSK 3.0 PDF will be imported by the owner **after** the app is ready. Do not request it as a prerequisite. Use a self-authored small PDF fixture in tests.

## Operating rules for Claude Code

- Work in GitHub repository with cloud-persistent code, protected `main`, small PRs, no dependence on transient local-only state.
- Before each milestone: read PRD and architecture, list plan and scope, write acceptance tests, implement, document manual device QA, push branch and create PR.
- Do not claim completion without actual verification and evidence (commands, results, screenshots/screen recording if available, TestFlight build, database checks).
- Prefer stable public SDKs and current docs; version-pin dependencies and note native build limitations.
- No mock success screenshots, silent skipping of failing tests or unverified claims.
- Never expose OpenAI/Azure/Supabase service role credentials in client or GitHub.
- Maintain `docs/DECISIONS.md` (the single official architecture decision log: ID, date, context, choice, rationale, consequences), `docs/FEATURES.md`, `docs/RELEASE_CHECKLIST.md`, and release notes.
- Every spike/integration result is labelled `VERIFIED` (real evidence), `MOCKED` (mock adapter, never reported as live) or `BLOCKED` (missing Docker, Apple signing, device or credentials — with owner instructions).
- Work on the session feature branch; never push directly to `main`; never self-merge a PR; do not start the next milestone before the owner accepts the current one.
- One feature module at a time; all changed module contracts must have version and regression tests.

## M0 — Repository, feasibility spikes, architecture gate

**Deliverables:** GitHub monorepo (pnpm workspaces + Turborepo), lockfile, Expo EAS dev build configuration, Supabase local/dev project and migrations template (`profiles` baseline + RLS test), Node.js TS API skeleton (Railway candidate, not deployed), CI, `.env.example`, setup guide, `docs/DECISIONS.md`, `docs/FEATURES.md`, `docs/RELEASE_CHECKLIST.md`, native compatibility matrix, `QuizType` registry contract with all six types, iOS physical-device smoke test.

**Critical spikes:** Google ML Kit Digital Ink iOS native bridge recognize 山 from touch strokes; record Mandarin audio using iPhone permission; verify Azure assessment path; OpenAI Realtime feasibility/auth spike only (backend mints time-limited client secret; no Realtime product feature, D-004); SQLCipher-encrypted `expo-sqlite` + Keychain key on an Expo development build (D-011); ensure Expo SDK/iOS deployment target compatible with all native libraries. Native compatibility blockers addressed before large UI implementation.

**Exit:** Development build launches on real iPhone; CI green; provider spikes pass or documented fallback selected with explicit approval.

## M1 — Identity, core schema, offline foundation

**Deliverables:** login/signup/logout, local secure session handling (tokens in secure storage), profiles, RLS for user-owned content, schema migrations, encrypted SQLite local read store/outbox (or owner-approved fallback per D-011) and first bidirectional sync.

**Exit:** A/B cross-user read/write denied by integration tests; offline mutation survives app kill and syncs exactly once after reconnect.

## M2 — Dictionary, course/library content model

**Deliverables:** shared lexicon (admin/pipeline-write only) + user-owned custom vocabulary with RLS (D-001), personal `vocabulary_items`, manual vocab entry, search Chinese/Pinyin/Vietnamese, personal notes, `tags`/`topics` tables with real FKs, vocabulary addition provenance (study date, lesson, topic, source document, import batch, entry method; D-006), lesson vocabulary relations, starter fixture course with documented rights (D-012), course/chapter/lesson schema, imported content provenance model.

**Exit:** Canonical shared lexeme doesn't duplicate across lessons; a normal user cannot modify shared lexicon or another user's custom vocabulary (negative RLS tests); study history is user-scoped; dictionary supports offline read of cached entries.

## M3 — Quiz engine + spaced repetition

**Deliverables:** quiz engine over the six-type `QuizType` registry (M3 renders `meaning_recognition`, `hanzi_recognition`, `pinyin_matching`; others follow in M5/M6), per-skill `review_cards` (user + vocabulary item + skill, D-007), due review, new-day quiz, multi-day recall, attempt records and learning events (no XP calculation, D-003), basic study session summary and resume.

**Exit:** next-review schedule responds correctly to success/failure per skill; no duplicate attempt records or learning events after replay; quiz works offline and syncs.

## M4 — PDF import pipeline

**Deliverables:** private PDF upload, async parsing, page-level provenance, structure extraction, human review screen, edits, course publishing, re-import/version/dedupe.

**Exit:** synthetic PDF uploaded from iPhone -> chapter/lesson/words reviewed -> published -> available for quiz; errors can retry; no leaked docs; no actual HSK PDF needed yet.

## M5 — Visual Hanzi + handwriting quiz

**Deliverables:** sourced historical character forms, visual evolution timeline and animations, evidence metadata; picture/meaning prompt -> stroke canvas -> ML Kit candidate recognition -> feedback.

**Exit:** 山 exercise works on an actual iPhone, target never leaked before submission, history sources displayed; unsupported invented historical forms prohibited.

## M6 — Listening, pronunciation and speaking

**Deliverables:** audio playback, dictation, recording, Azure reference-based pronunciation feedback, `speaking_attempts` linked to user/vocabulary item/lesson/quiz attempt (D-008), OpenAI turn-based voice role-play first; Realtime only behind a feature flag after a documented on-device stability proof (D-004); progress storage and privacy controls.

**Exit:** mic denied/poor network/retry handled; reference text scoring fields grounded in provider output; learners can review missed words; no recordings publicly visible.

## M7 — AI explanations, image import, gamification, notifications

**Deliverables:** tutor explanation with prompt validation, image/screenshot OCR import, XP engine consuming learning events emitted since M3 (idempotent `xp_ledger`, D-003), streak/levels/achievements, notifications, profile and progress dashboards.

**Exit:** all features integrate with same vocabulary item ID, review history and study events; XP granted exactly once per qualifying event including offline replays; image OCR corrections are user-confirmed; notification opt-out works.

## M8 — Modular extensibility audit & TestFlight pilot

**Deliverables:** new quiz type proof-of-extension, plug-in provider substitution test, migration rehearsals, E2E regression, on-device accessibility audit, privacy disclosures, monitoring and cost controls, TestFlight installation guide.

**Exit:** real iPhone TestFlight build passes complete learner journey; online/offline, upload, quiz, voice and ink flows audited; rollback plan and operational runbook exist.

## Post-iOS gate — Android readiness

Verify Android-specific permissions, Digital Ink bridge, audio SDK, filesystem, background sync, notifications, Google Play policies; no assumption iOS native integration automatically works on Android.

## Standard milestone report template

```text
Milestone / branch / commit / PR:
Delivered features:
Database migrations:
Tests run + pass/fail:
iPhone device verification:
Online/offline & permission cases:
Security/RLS checks:
Known gaps and blockers:
Docs updated:
GO/NO-GO decision:
```

## FIRST CLAUDE CODE PROMPT (copy into Claude Code)

You are the lead engineer for Mandarin AI, an iOS-first, Android-ready React Native/Expo mobile application. Read `docs/MASTER_PRD.md`, `docs/ARCHITECTURE.md`, and `docs/MILESTONES_CLAUDE_CODE.md` in full. Do not start implementing all features. Start with M0 only. Produce an explicit architecture/compatibility checklist for current Expo SDK, React Native, Google ML Kit Digital Ink iOS native module, audio recording, Azure pronunciation, OpenAI Realtime mobile auth, SQLite, and Supabase. Establish a persistent GitHub repository workflow (pnpm workspaces + Turborepo) with CI, EAS development build and configuration. Implement minimal iOS device proof of concept for handwritten 山 recognition and Mandarin audio capture, with safe mock/provider adapters where credentials are unavailable; clearly label mocked results. Produce actual verification evidence and a concise M0 report. Do not claim iPhone tests passed without testing on a physical iPhone. Do not require the owner's HSK 3.0 PDF yet; test the later ingestion pipeline with authored sample PDFs. Preserve open module architecture, deny privileged operations to the mobile client, and don't commit secrets. Stop after M0 for review.
