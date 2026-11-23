# Mandarin AI — Mobile Technical Architecture v1.3

> v1.3 incorporates owner decisions D-001 … D-013. The authoritative decision log is `docs/DECISIONS.md`; this document describes the resulting architecture.

## Architecture decision record

**Chosen:** iOS-first Expo React Native + TypeScript, Supabase Postgres/Auth/Storage, on-device SQLite (SQLCipher-encrypted where proven), OpenAI API (turn-based first, Realtime gated), Azure AI Speech pronunciation assessment, Google ML Kit Digital Ink. Separately deployed TypeScript Node.js API and background PDF worker (Railway is the hosting candidate; no Railway-specific APIs in domain logic). pnpm workspaces + Turborepo monorepo. Cloud persistence with offline-first selected study flows. Android-ready but iOS validated first.

**Style:** Modular monolith + explicit module contracts + ports/adapters, not uncontrolled runtime plugin execution or premature microservices.

**Warning:** Expo Go cannot test all required native integrations; use development builds on an iPhone and later EAS/TestFlight. ML Kit Digital Ink consumes vector touch strokes, whereas PDF/photo import is OCR/document parsing. Azure speech should be evaluated on device through a server-side adapter or viable native integration (don't assume an official React Native SDK). OpenAI real-time credentials must be short-lived and issued via backend.

## Logical components

```mermaid
flowchart TD
  A[iOS React Native Expo] --> L[SQLite offline store + Outbox]
  A --> C[Application service layer]
  C --> D[Supabase Auth and RLS Postgres]
  C --> B[Authenticated Backend API]
  B --> O[OpenAI adapter: text, vision, realtime sessions]
  B --> Z[Azure Speech adapter]
  B --> P[PDF extraction background job workers]
  P --> S[Private Supabase Storage]
  B --> D
  A --> I[Native Digital Ink adapter - iOS ML Kit]
  C --> E[Learning Events]
  E --> R[Review Scheduler]
  E --> G[Gamification]
```

## Repository structure

```text
mandarin-ai/
  apps/mobile/                         # Expo Router app, iOS first (Expo SDK 58 dev build)
    app/                               # navigation only
    modules/digital-ink/               # local Expo native module (Swift, ML Kit Digital Ink)
    src/components/                    # shared UI
    src/modules/                       # feature screens/controllers
    src/native/                        # iOS module integration wrappers
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
- Domain code is pure TypeScript and can run in tests without React Native or cloud APIs.
- External providers implement ports: `AiTutorPort`, `ConversationPort`, `PronunciationAssessmentPort`, `DocumentExtractionPort`, `DigitalInkPort`, `TextToSpeechPort`, `LearningRepository`, `ContentRepository`, `SyncTransport`.
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

1. Local SQLite is read model for downloaded lesson content, vocabulary, due reviews, local attempts and outbox. The database is encrypted with SQLCipher (`expo-sqlite` config plugin `useSQLCipher`), with a random per-install key generated on device and stored in the iOS Keychain via `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Auth tokens are stored in secure storage, never in plain SQLite/AsyncStorage. Raw audio is not persisted locally beyond the active attempt unless the learner opts in (D-011).
2. Each offline mutation gets ULID/UUID, device ID, user ID, schema version, logical timestamp, and immutable event payload.
3. UI writes local state plus outbox entry atomically.
4. On network restoration, sync worker sends bounded idempotent batches with auth; server verifies ownership, dedupes and acknowledges canonical versions.
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
- **Azure AI Speech:** reference-based pronunciation evaluation (zh-CN); test scores/available dimensions and Vietnamese user accents on real devices before enabling any definitive tone judgement.
- **Google ML Kit Digital Ink:** iOS native bridge receives coordinate/timestamp strokes, downloads correct language model, returns candidate Hanzi; test model licensing and packaging/deployment. Not photo OCR.
- **Text-to-Speech:** configurable provider (Azure or OpenAI); cache reusable voice assets where licensing permits. No need to make a premature exclusive choice.

## Platform and release

- iOS minimum version decided after latest Expo, ML Kit and Azure integration compatibility matrix is tested.
- Expo EAS Development Build from first native-integration milestone, not only Expo Go. Current baseline: Expo SDK 58 / React Native 0.88 / iOS deployment target 16.4 (floor set by `expo-modules-core` and `expo-sqlite`); see `docs/NATIVE_COMPATIBILITY.md`.
- Backend hosting: `apps/api` (and later the PDF worker) are plain Node.js processes configured by environment variables; Railway is the candidate host. No production deploy in M0 (D-009).
- TestFlight private beta -> staged App Store release after privacy and safety review.
- CI: lint, TypeScript, unit, integration with Supabase policies, migration checks, mobile JS bundle/prebuild checks, EAS build (when `EXPO_TOKEN` is configured), end-to-end smoke tests on actual iPhone (manual evidence until device automation exists).
- Feature flags for incomplete features; release should not represent mocked AI responses as production.
- Keep Android compatibility in shared logic; postpone Android native bridge validation and Play distribution to a separate release gate.

## Architecture acceptance probes

1. Add a new `QuizType` and renderer without modifying old question graders; regression suite remains green.
2. Add a new course from PDF without app code edit and without duplicating a known lexeme.
3. Swap mock OpenAI/Azure/Ink adapters for live ones in integration tests without changing domain code.
4. Offline quiz -> process killed -> reopen -> reconnect -> exactly one server attempt, correct next review, one XP grant.
5. User A cannot read user B documents, attempts, audio or dictionary even with guessed UUIDs.
6. Failed PDF import can resume/retry; published course is not partially corrupted.
