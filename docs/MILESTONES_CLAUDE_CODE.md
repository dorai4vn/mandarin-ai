# Mandarin AI — Claude Code Execution Plan v1.2

This plan prioritizes a real iOS application, audited architecture, and real data operations. The HSK 3.0 PDF will be imported by the owner **after** the app is ready. Do not request it as a prerequisite. Use a self-authored small PDF fixture in tests.

## Operating rules for Claude Code

- Work in GitHub repository with cloud-persistent code, protected `main`, small PRs, no dependence on transient local-only state.
- Before each milestone: read PRD and architecture, list plan and scope, write acceptance tests, implement, document manual device QA, push branch and create PR.
- Do not claim completion without actual verification and evidence (commands, results, screenshots/screen recording if available, TestFlight build, database checks).
- Prefer stable public SDKs and current docs; version-pin dependencies and note native build limitations.
- No mock success screenshots, silent skipping of failing tests or unverified claims.
- Never expose OpenAI/Azure/Supabase service role credentials in client or GitHub.
- Maintain `docs/DECISIONS.md`, `docs/FEATURES.md`, `docs/RELEASE_CHECKLIST.md`, and release notes.
- One feature module at a time; all changed module contracts must have version and regression tests.

## M0 — Repository, feasibility spikes, architecture gate

**Deliverables:** GitHub monorepo, Expo EAS dev build, Supabase local/dev project and migrations template, CI, `.env.example`, architectural decision records, iOS physical-device smoke test.

**Critical spikes:** Google ML Kit Digital Ink iOS native bridge recognize 山 from touch strokes; record Mandarin audio using iPhone permission; verify Azure assessment path; obtain time-limited OpenAI voice session credentials; ensure Expo SDK/iOS deployment target compatible with all native libraries. Native compatibility blockers addressed before large UI implementation.

**Exit:** Development build launches on real iPhone; CI green; provider spikes pass or documented fallback selected with explicit approval.

## M1 — Identity, core schema, offline foundation

**Deliverables:** login/signup/logout, local secure session handling, profiles, RLS for user-owned content, schema migrations, SQLite local read store/outbox and first bidirectional sync.

**Exit:** A/B cross-user read/write denied by integration tests; offline mutation survives app kill and syncs exactly once after reconnect.

## M2 — Dictionary, course/library content model

**Deliverables:** manual vocab entry, search Chinese/Pinyin/Vietnamese, personal notes/tags, lesson vocabulary relations, empty library, course/chapter/lesson schema, imported content provenance model.

**Exit:** Canonical shared lexeme doesn't duplicate across lessons; study history is user-scoped; dictionary supports offline read of cached entries.

## M3 — Quiz engine + spaced repetition

**Deliverables:** meaning/Pinyin recognition, due review, new-day quiz, multi-day recall, attempt/event records, basic study session summary and resume.

**Exit:** next-review schedule responds correctly to success/failure; no double records/XP; quiz works offline and syncs.

## M4 — PDF import pipeline

**Deliverables:** private PDF upload, async parsing, page-level provenance, structure extraction, human review screen, edits, course publishing, re-import/version/dedupe.

**Exit:** synthetic PDF uploaded from iPhone -> chapter/lesson/words reviewed -> published -> available for quiz; errors can retry; no leaked docs; no actual HSK PDF needed yet.

## M5 — Visual Hanzi + handwriting quiz

**Deliverables:** sourced historical character forms, visual evolution timeline and animations, evidence metadata; picture/meaning prompt -> stroke canvas -> ML Kit candidate recognition -> feedback.

**Exit:** 山 exercise works on an actual iPhone, target never leaked before submission, history sources displayed; unsupported invented historical forms prohibited.

## M6 — Listening, pronunciation and speaking

**Deliverables:** audio playback, dictation, recording, Azure reference-based pronunciation feedback, OpenAI turn-based role-play and later Realtime where proven stable; progress storage and privacy controls.

**Exit:** mic denied/poor network/retry handled; reference text scoring fields grounded in provider output; learners can review missed words; no recordings publicly visible.

## M7 — AI explanations, image import, gamification, notifications

**Deliverables:** tutor explanation with prompt validation, image/screenshot OCR import, XP/streak/levels/achievements, notifications, profile and progress dashboards.

**Exit:** all features integrate with same vocabulary ID, review history and study events; image OCR corrections are user-confirmed; notification opt-out works.

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

You are the lead engineer for Mandarin AI, an iOS-first, Android-ready React Native/Expo mobile application. Read `docs/MASTER_PRD.md`, `docs/ARCHITECTURE.md`, and `docs/MILESTONES_CLAUDE_CODE.md` in full. Do not start implementing all features. Start with M0 only. Produce an explicit architecture/compatibility checklist for current Expo SDK, React Native, Google ML Kit Digital Ink iOS native module, audio recording, Azure pronunciation, OpenAI Realtime mobile auth, SQLite, and Supabase. Establish a persistent GitHub repository workflow with CI, EAS development build and configuration. Implement minimal iOS device proof of concept for handwritten 山 recognition and Mandarin audio capture, with safe mock/provider adapters where credentials are unavailable; clearly label mocked results. Produce actual verification evidence and a concise M0 report. Do not claim iPhone tests passed without testing on a physical iPhone. Do not require the owner's HSK 3.0 PDF yet; test the later ingestion pipeline with authored sample PDFs. Preserve open module architecture, deny privileged operations to the mobile client, and don't commit secrets. Stop after M0 for review.
