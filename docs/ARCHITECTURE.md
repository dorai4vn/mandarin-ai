# Mandarin AI — Technical Architecture v2.0 (Web/PWA)

> v2.0 moves the client from React Native/Expo to a Next.js web app + PWA optimised for Safari on iPhone (D-018 … D-027). v1.3 incorporated owner decisions D-001 … D-013. The authoritative decision log is `docs/DECISIONS.md`; this document describes the resulting architecture.

## Architecture decision record

**Chosen:** Mobile-first Next.js (App Router) + TypeScript + Tailwind CSS web app, installable as a PWA (manifest + Serwist service worker), primary target Safari on iPhone; Supabase Postgres/Auth/Storage; IndexedDB (Dexie) offline store + outbox with idempotent sync; separately deployed Fastify Node.js API and background PDF worker (Railway candidate, no host-specific APIs in domain logic); OpenAI API (turn-based first, Realtime gated); Azure AI Speech pronunciation assessment via the API; handwriting recognition through a web/backend `HandwritingRecognitionPort` adapter. pnpm workspaces + Turborepo monorepo.

**Style:** Modular monolith + explicit module contracts + ports/adapters, not uncontrolled runtime plugin execution or premature microservices.

**Warnings:** Acceptance happens on a real iPhone in Safari (tab and Home-Screen mode); desktop Chrome or Playwright WebKit are not sufficient. Safari has no Background Sync, no Web Bluetooth/NFC, limited Web Push (Home-Screen apps, iOS ≥ 16.4), separate storage for Home-Screen apps, possible storage eviction, and `MediaRecorder` produces AAC/MP4 (Azure REST needs WAV/PCM) — see the Safari constraints section. Handwriting recognition consumes vector strokes; PDF/photo import is OCR/document parsing. OpenAI Realtime credentials must be short-lived and issued via the backend.

## Logical components

```mermaid
flowchart TD
  A[Next.js PWA - Safari iPhone] --> W[Service worker: app shell + asset cache]
  A --> L[IndexedDB offline store + Outbox]
  A --> C[Application service layer]
  C --> D[Supabase Auth and RLS Postgres]
  C --> B[Authenticated Backend API]
  B --> O[OpenAI adapter: text, vision, realtime sessions]
  B --> Z[Azure Speech adapter]
  B --> P[PDF extraction background job workers]
  P --> S[Private Supabase Storage]
  B --> D
  A --> I[HandwritingRecognitionPort: in-browser adapter or API adapter]
  B --> I2[Optional server-side handwriting adapter]
  C --> E[Learning Events]
  E --> R[Review Scheduler]
  E --> G[Gamification]
```

## Repository structure

```text
mandarin-ai/
  apps/web/                            # Next.js App Router PWA (mobile-first, Safari iPhone)
    app/                               # routes/layouts only
    src/modules/                       # feature modules (dictionary, practice, library, …)
    src/components/                    # shared UI (Tailwind)
    src/offline/                       # IndexedDB schema (Dexie), outbox, sync engine
    src/platform/                      # browser adapters: handwriting canvas, audio capture (AudioWorklet), push
    src/sw.ts                          # Serwist service worker source
    public/manifest.webmanifest        # PWA manifest + icons
  apps/mobile/                         # LEGACY M0 native spike (Expo) — frozen, removed after M0-PWA approval
  apps/api/                            # Node.js TS service: privileged AI calls, auth-checked
                                       #   (PDF worker entrypoint added in M4, same codebase)
  packages/contracts/                  # zod schemas, API types, events, QuizType ids, skills
  packages/domain/                     # pure domain rules, SRS, quiz engine, QuizType registry
  packages/adapters/                   # ports and provider adapters (mock adapters labelled MOCK)
  packages/design-system/              # tokens and reusable UI (created when first UI lands, M1+)
  packages/config/                     # shared tsconfig / lint presets
  supabase/migrations/                 # versioned DB changes
  supabase/tests/                      # SQL/RLS tests
  docs/                                # PRD, DECISIONS.md, FEATURES.md, checklists, runbooks
  .github/workflows/                   # checks

Package dependency direction (no cycles, enforced by lint/CI): `contracts` <- `domain` <- `adapters` <- `apps/*`. `contracts` depends on nothing internal; `domain` depends only on `contracts`; `adapters` on `contracts` (+ `domain` types); apps may depend on all packages, packages never depend on apps.
```

## Layering and dependency rules

- UI modules depend on domain contracts and application interfaces, not on other modules' private table schemas.
- Domain code is pure TypeScript and can run in tests without a browser, React or cloud APIs.
- External providers implement ports: `AiTutorPort`, `ConversationPort`, `PronunciationAssessmentPort`, `DocumentExtractionPort`, `HandwritingRecognitionPort` (was `DigitalInkPort`), `TextToSpeechPort`, `LearningRepository`, `ContentRepository`, `SyncTransport`.
- Versioned `QuizType` registry with exactly six initial types: `meaning_recognition`, `hanzi_recognition`, `pinyin_matching`, `audio_recognition`, `dictation`, `handwriting` (D-002). Each registration declares `id`, `version`, trained `skill`, answer schema and grader; renderers register on the client. Add quiz types by registration plus a type-specific renderer/grader.
- Skill mapping (D-007): `meaning_recognition`, `hanzi_recognition`, `pinyin_matching` -> `meaning`; `audio_recognition`, `dictation` -> `listening`; `handwriting` -> `writing`; speaking practice (not a `QuizType`) -> `speaking`.
- Content is sourced from dynamic course/lesson records, never hard-coded into source code.
- Client module registry is a typed code registry controlled by product releases, not remote executable JavaScript.
- Database migrations are reviewed independently; avoid circular module dependencies.

## Database domain model (initial)

This is the target model. M0 ships only the migration template and the `profiles` baseline with RLS tests; the remaining tables are created by reviewed migrations in M1 (identity/sync), M2 (lexicon, vocabulary, tags/topics, course/library), M3 (quiz/review) and later milestones.

### Identity & content
`profiles(id auth.uid FK, settings, created_at)`
`courses(id, owner_id, title, language_level, visibility, latest_version_id)`
`course_versions(id, course_id, version_number, status, source_document_id)`
`chapters(id, course_version_id, ordinal, title)`
`lessons(id, chapter_id, ordinal, title, publication_status)`
`lesson_sections(id, lesson_id, section_type, content_json, source_page_start, source_page_end)`
`source_documents(id, owner_id, storage_key, mime_type, content_hash, access_scope, rights_metadata)`
`document_import_jobs(id, owner_id, source_document_id, status, progress, error_code, retry_count)`

`import_batches(id, owner_id, document_import_job_id NULL, kind, status, created_at)` — groups words added by one import or bulk action.
`content_admins(user_id PK)` — users allowed to curate shared content (checked by `is_content_admin()` in RLS).

### Shared lexicon (canonical, D-001)
Read-only for normal users; written only by `service_role` (import pipeline / API) or `content_admins`.
`lexemes(id, simplified, traditional, pinyin_display, normalized_pinyin, sense_key, source_provenance, UNIQUE(simplified, normalized_pinyin, sense_key))`
`lexeme_senses(id, lexeme_id FK, lang, gloss, source)`
`hanzi_characters(id, glyph, variant_type, meaning)`
`hanzi_historical_forms(id, character_id, script_stage, attestation_reference, media_id, review_status)`
`hanzi_media(id, storage_key, media_type, license, source)`
`lexeme_characters(lexeme_id, character_id, position)`
`lesson_lexemes(id, lesson_id, lexeme_id FK NULL, custom_lexeme_id FK NULL, source_page, context_json, CHECK exactly one of lexeme_id/custom_lexeme_id)` — `custom_lexeme_id` is only allowed in lessons of a private course owned by the same user (enforced by trigger + RLS).

### User-owned vocabulary (D-001, D-006)
All rows carry `user_id`/`owner_id`; RLS: owner only. Composite foreign keys `(id, user_id)` guarantee that link tables never mix two users' rows.
`custom_lexemes(id, owner_id, simplified, traditional, pinyin_display, normalized_pinyin, gloss_vi, example, suggested_lexeme_id FK lexemes NULL, created_at, updated_at, UNIQUE(owner_id, simplified, normalized_pinyin, gloss_vi), UNIQUE(id, owner_id))`
`vocabulary_items(id, user_id, lexeme_id FK NULL, custom_lexeme_id NULL, notes, mastery_state, first_seen_at, CHECK exactly one of lexeme_id/custom_lexeme_id, FK (custom_lexeme_id, user_id) -> custom_lexemes(id, owner_id), UNIQUE(user_id, lexeme_id), UNIQUE(user_id, custom_lexeme_id), UNIQUE(id, user_id))` — the learner's personal dictionary entry; replaces `user_lexemes`.
`vocabulary_additions(id, user_id, vocabulary_item_id, study_date DATE, lesson_id FK NULL, source_document_id FK NULL, import_batch_id FK NULL, source_page NULL, entry_method ENUM(manual, pdf_import, image_import, text_import, starter_fixture), created_at, idempotency_key UNIQUE, FK (vocabulary_item_id, user_id) -> vocabulary_items(id, user_id))` — one row per time a word is added/encountered; provenance trail.
`topics(id, owner_id, name, created_at, UNIQUE(owner_id, lower(name)), UNIQUE(id, owner_id))`
`tags(id, owner_id, name, color NULL, created_at, UNIQUE(owner_id, lower(name)), UNIQUE(id, owner_id))`
`vocabulary_item_topics(user_id, vocabulary_item_id, topic_id, PK(vocabulary_item_id, topic_id), composite FKs on (id, user_id))`
`vocabulary_item_tags(user_id, vocabulary_item_id, tag_id, PK(vocabulary_item_id, tag_id), composite FKs on (id, user_id))`
`vocabulary_addition_topics(user_id, vocabulary_addition_id, topic_id, PK(...))` — topic chosen at entry time.

### Study and review
`study_sessions(id, user_id, started_at, completed_at, source_context)`
`quiz_sessions(id, user_id, mode, state, started_at, completed_at)`
`quiz_attempts(id, quiz_session_id, user_id, vocabulary_item_id, quiz_type, quiz_type_version, skill, response_json, correct, created_at, idempotency_key UNIQUE, UNIQUE(id, user_id))`
`writing_attempts(id, quiz_attempt_id, stroke_data_key, recognition_json, feedback_json)`
`listening_attempts(id, user_id, vocabulary_item_id, quiz_attempt_id NULL, prompt_id, answer_json, created_at)`
`speaking_attempts(id, user_id, vocabulary_item_id NULL, lesson_id NULL, quiz_attempt_id NULL, reference_text, provider, provider_status, assessment_json, recording_key NULL, created_at, idempotency_key UNIQUE)` (D-008; nullable links because free-form role-play has no item/lesson; composite FKs on `(id, user_id)` keep links within the same user)
`review_cards(id, user_id, vocabulary_item_id, skill ENUM(meaning, writing, listening, speaking), srs_algorithm, srs_state_json, due_at, last_reviewed_at, UNIQUE(user_id, vocabulary_item_id, skill))` (D-007; one schedule per skill, never duplicated)
`xp_ledger(id, user_id, source_event_id UNIQUE, points, created_at)` — created and populated from `learning_events` in M7 (D-003); M3 writes events only.
`achievements(id, code, description)` / `user_achievements(user_id, achievement_id, achieved_at)`
`notifications_preferences(user_id, timezone, quiet_hours, enabled)`
`push_subscriptions(id, user_id, endpoint UNIQUE, p256dh, auth, user_agent, created_at, last_success_at, revoked_at)` — Web Push (VAPID) subscriptions, owner-only RLS (D-024, M7)
`learning_events(id, user_id, event_type, event_version, payload_json, occurred_at, idempotency_key UNIQUE)`
`sync_operations(id, user_id, operation_id UNIQUE, client_device_id, entity_type, status, server_version)`

### Security and constraints
- RLS enabled on **all** learner-scoped tables; user can only read/write their own records. Shared curated lexicon/history are read-only for normal users.
- Validate upload ownership and authorization in backend and storage policy; avoid client-supplied privileged IDs.
- Use foreign keys and unique constraints, especially `vocabulary_items`, `review_cards(user_id, vocabulary_item_id, skill)` and idempotency keys.
- Normal users have SELECT-only access to shared lexicon/Hanzi tables; INSERT/UPDATE/DELETE require `service_role` or `is_content_admin()`.
- Store audio/PDF in private buckets, expose only authorized signed URLs with limited lifespan.
- Encrypt/treat personal recordings and notes as sensitive learner data; implement retention and deletion jobs.

## Offline synchronization protocol

1. Local IndexedDB (Dexie) is the read model for downloaded lesson content, vocabulary, due reviews, local attempts and the outbox (D-021). `navigator.storage.persist()` is requested; the UI shows unsynced operation count and warns before logout. Sensitive fields are encrypted with a non-extractable Web Crypto AES-GCM key (D-022, limits documented). Sessions are handled by Supabase Auth (`@supabase/ssr`); provider secrets never reach the browser. Raw audio is not persisted locally beyond a pending upload the learner approved.
2. Each offline mutation gets ULID/UUID, device ID, user ID, schema version, logical timestamp, and immutable event payload.
3. UI writes local state plus outbox entry atomically (single IndexedDB transaction).
4. Sync runs on app start, `online`, `visibilitychange` (visible), end of each study session and a timer while the app is open (Safari has no Background Sync API). It sends bounded idempotent batches with auth; server verifies ownership, dedupes by `operation_id`/`idempotency_key` and acknowledges canonical versions. A Web Lock (or IndexedDB lease) prevents two tabs syncing at once.
5. Use append-only attempts/learning events for conflict-free review history. Server deterministically replays SRS state in causal order. For editable notes, use server revision / conflict UI or explicit last-write-wins policy only after documented decision.
6. Downloads use per-user cursor/updated_at + tombstones; deletion and logout purge appropriate local data.
7. Re-run after interruptions without double XP or lost attempts; local audio remains local until approved upload.

## PDF ingestion and provenance

`uploaded -> validating -> extracting -> structuring -> awaiting_review -> published` (plus failed/cancelled).

- Text-layer extraction first; OCR/vision if scanned.
- Preserve document page/source span and confidence on each extracted item.
- Structured model output is a draft; user approves and edits before publication.
- Normalize Hanzi/Pinyin with language-aware checks; use sense-aware lexeme matching.
- Import by content hash + course version; retries idempotent and never overwrite learner edits.
- Queue chunked processing with caps for file size/pages/cost and observable failures.
- Initially documents are private; licensing and public reuse require explicit authorization.

## AI provider boundaries

- **OpenAI:** grammar/example/quiz draft generation, document understanding and role-play. Turn-based voice first; Realtime only after an on-device stability proof (D-004). M0 performs a feasibility/auth spike only: the API mints short-lived Realtime client secrets for authenticated users; mocked responses are always labelled `MOCK` and never reported as live.
- **Azure AI Speech:** reference-based pronunciation evaluation (zh-CN) through `apps/api`; the browser records PCM via `AudioWorklet` and sends 16 kHz mono WAV (D-023); test scores/available dimensions and Vietnamese user accents on real devices before enabling any definitive tone judgement.
- **Handwriting recognition (D-020):** canvas Pointer Events capture (x, y, t) strokes; `HandwritingRecognitionPort` adapters are evaluated in M0-PWA (in-browser `hanzilookup-js`; target-aware stroke matching with Hanzi Writer data after submission; optional server adapter in `apps/api` only with owner approval). No quality claim before measured top-1/top-5 on real iPhone samples. Unofficial endpoints are not used.
- **Text-to-Speech:** configurable provider (Azure or OpenAI); cache reusable voice assets where licensing permits. No need to make a premature exclusive choice.

## Platform and release

- Client: Next.js 16 web app, `output: 'standalone'`, served over HTTPS (Railway candidate, D-026); PWA manifest (`display: standalone`, icons incl. `apple-touch-icon`), Serwist service worker for app shell, static assets and downloaded study content.
- Supported targets: iPhone Safari (current and previous major iOS; minimum to be fixed after M0-PWA device tests, Web Push needs iOS ≥ 16.4), Home-Screen mode; Android Chrome and desktop browsers as secondary.
- Distribution: private beta at an HTTPS URL with invite-only accounts; no App Store/TestFlight.
- CI: lint, TypeScript, unit (Vitest + fake-indexeddb), integration with Supabase policies, migration checks, `next build`, Playwright E2E on WebKit with iPhone emulation, Lighthouse/PWA manifest check. Real-iPhone Safari checks are manual with evidence (`docs/RELEASE_CHECKLIST.md`).
- Feature flags for incomplete features; release must not represent mocked AI or recognition results as production.
- Legacy `apps/mobile` (Expo) is frozen and removed only after M0-PWA approval (`docs/MIGRATION_M0_PWA.md`).

## Safari iOS constraints (design inputs)

| Constraint | Design response |
|---|---|
| No Background Sync / Periodic Sync | Sync on open/online/visibility/session end; show pending count |
| Home-Screen app storage is separate from Safari tab | Login and offline download happen inside the installed app; onboarding explains this |
| Storage may be evicted (quota/inactivity) | `storage.persist()`, server is source of truth, outbox flushed eagerly, re-download on demand |
| Magic links open Safari, not the installed app | E-mail OTP code / password (D-025) |
| Web Push only for Home-Screen apps, iOS ≥ 16.4, after user gesture | Push + in-app reminders (D-024) |
| `MediaRecorder` = AAC/MP4 | AudioWorklet PCM → WAV 16 kHz (D-023) |
| getUserMedia/service worker need HTTPS; mic permission may be re-asked | HTTPS everywhere; recoverable permission UX |
| Audio autoplay needs user gesture | Start playback from taps; `playbackRate` for slow audio |
| Touch gestures (scroll, double-tap zoom, edge swipe) | Canvas `touch-action: none`, Pointer Events, prevent zoom; inputs ≥ 16 px |
| `100vh`, keyboard and notch | `dvh` units, `viewport-fit=cover`, `env(safe-area-inset-*)` |

## Architecture acceptance probes

1. Add a new `QuizType` and renderer without modifying old question graders; regression suite remains green.
2. Add a new course from PDF without app code edit and without duplicating a known lexeme.
3. Swap mock OpenAI/Azure/handwriting adapters for live ones in integration tests without changing domain code.
4. Offline quiz -> Safari tab/PWA killed -> reopen -> reconnect -> exactly one server attempt, correct next review, one XP grant (M7).
5. User A cannot read user B documents, attempts, audio or dictionary even with guessed UUIDs.
6. Failed PDF import can resume/retry; published course is not partially corrupted.
