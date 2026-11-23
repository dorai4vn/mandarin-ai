# Mandarin AI — Master Product Requirements Document

Version: 2.0 | Date: 2026-11-23 | Status: Product requirements approved; platform changed to Web/PWA (D-018); M0-PWA planning

> v1.3 aligned this PRD with owner decisions D-001 … D-013. v2.0 changes the delivery platform from a React Native/Expo iOS app to a Next.js web app + PWA optimised for Safari on iPhone (D-018 … D-027). **All 11 functional domains are kept.** Where wording differs, `docs/DECISIONS.md` is authoritative.

## 1. Product definition

Mandarin AI is a mobile-first Chinese learning web application (installable PWA) for Vietnamese-speaking learners. The primary target is Safari on iPhone, used in the browser or added to the Home Screen; Android browsers and desktop use the same codebase. No App Store, TestFlight or native build is required. The product starts with learner-imported HSK 3.0 teaching PDFs after the app is built; future textbooks must be addable without code changes. The learning experience is powered by a personal vocabulary dictionary, spaced-repetition reviews, handwriting games, listening and speaking practice, and explanations of Hanzi evolution grounded in verifiable historical sources.

### Goals
- Enable users to study daily from personally entered words and imported textbooks.
- Improve long-term recall through short quizzes and adaptive review, including earlier days' words.
- Connect meaning, images, shape, handwriting, listening and speaking in one learner record.
- Support useful offline study and reliable syncing when internet returns.
- Allow additional learning modules and content sources without rewriting the core application.

### Non-goals for initial release
- A public marketplace for third-party executable plugins.
- Automatically sharing commercial uploaded textbooks with other users.
- Guaranteeing clinical/phonetic-grade tone assessment without field validation.
- Native iOS/Android apps or app-store distribution (may be revisited later as a wrapper around the same web app).
- Guaranteeing parity of Android/desktop browser behaviour before the iPhone Safari acceptance criteria are met.

## 2. Confirmed product scope (11 domains)

### PRD-01 Daily vocabulary intake
- Learner can input Chinese word or character, Pinyin, Vietnamese meaning and optional example/notes; app offers suggestions but does not silently overwrite user data.
- Two vocabulary sources exist (D-001): the **shared lexicon** (canonical, curated data; only administrators or the import pipeline may change it) and **user-owned custom vocabulary** (created/edited by the learner, protected by RLS). A learner's personal dictionary item references exactly one of the two. A learner can never edit shared canonical content or another learner's custom vocabulary.
- When a typed entry matches a shared lexeme, the app suggests linking to it; otherwise the entry is saved as custom vocabulary (optionally linked to a suggested canonical lexeme).
- Each addition records provenance (D-006): study date, optional lesson, topic(s), source document, import batch, entry method and source page where available.
- Duplicate detection suggests merge/link instead of deleting or repeating an existing entry.

**Acceptance:** User adds five words; app restarts and all five persist; adding a known word from another lesson links the lesson rather than duplicating the personal dictionary entry.

### PRD-02 Personal dictionary
- Search by simplified/traditional Hanzi, diacritic or numbered Pinyin, and Vietnamese meaning (accent-insensitive search is a target).
- Show pronunciation, examples, meanings, tags, course/lesson occurrences and individual learning history.
- Edit personal notes, manage tags and topics (real tables with foreign keys, D-006) and filter by due review or mastery.
- Distinguish a multi-character word from its component Hanzi; one character may have its own etymology resource.

**Acceptance:** User finds 山 via 山, shan1 and núi; sees all lessons referencing the character and prior attempts.

### PRD-03 Hanzi visual etymology
- Display real-world reference imagery, explanation of graphic formation, verified historical attested forms when available, and transitions/animations to modern script.
- Historical forms must have source, script stage, provenance and review status.
- Do not claim all characters are pictographs or that every historical stage is known. Where evidence is insufficient, clearly say so.
- Cache historical media for reused characters rather than regenerating per lesson.

**Acceptance:** 山 detail shows sourced historical stages, user-friendly explanations, animation, and provenance; an unsupported form is not invented.

### PRD-04 Quiz & spaced repetition
- Quiz types (exactly six in the versioned `QuizType` registry, D-002): `meaning_recognition`, `hanzi_recognition`, `pinyin_matching`, `audio_recognition`, `dictation`, `handwriting`.
- Review schedules are kept per **user + vocabulary item + skill** (`meaning`, `writing`, `listening`, `speaking`) (D-007); each quiz type declares which skill it trains, and the same skill never gets duplicate schedules.
- New words receive same-day quick practice; previous days' due words are included based on a documented scheduling algorithm.
- Persist per-item attempts and use them to compute next review, avoiding double credit for repeat submissions.
- Quiz session survives app interruption and resume.

**Acceptance:** Failed word becomes due sooner than a successfully recalled word; past-day cards appear even when new words are added; a failure in one skill (e.g. writing) does not reset another skill's schedule (e.g. meaning).

### PRD-05 Hint-to-handwriting mini game
- Present a picture or Vietnamese meaning; user must recall the matching Chinese character and draw it using finger/stylus.
- Never reveal the target character before answer submission; show model and stroke guidance afterward.
- Collect vector strokes (coordinates, timestamps) from a touch/stylus canvas (Pointer Events); recognise candidate characters through a `HandwritingRecognitionPort` adapter that runs in the browser or on the backend (D-020). Recognition quality must be measured on real iPhone handwriting before any claim; Google ML Kit Digital Ink is no longer used (no web SDK).
- Record recognizer confidence/candidates and allow a retry or manual appeal; do not equate recognition alone with perfect stroke order.
- Start with single-character prompts, then extend to words/phrases via plugin-type quiz contracts.

**Acceptance:** User sees mountain image, writes 山, gets verified recognition/feedback; wrong candidate does not count as correct; result syncs.

### PRD-06 Listening and speaking
- Listen to word/sentence/audio at normal and slower playback speeds.
- Listening exercise: select meaning, identify spoken word, or write dictated Hanzi.
- Speaking: record and replay, submit against a known reference phrase for Azure AI Speech pronunciation assessment; show available assessment dimensions and constructive Vietnamese feedback.
- AI role-play: Chinese conversations using OpenAI, constrained by learner level and recently learned vocabulary. Turn-based voice ships first; OpenAI Realtime is enabled only after it is proven stable on device (D-004).
- Store attempt metadata, scores where provider supports them, feedback and recurring difficulties; raw recordings retention is configurable and minimized.
- Speaking attempts link to the user and, where applicable (nullable), to the vocabulary item, lesson and quiz attempt (D-008).
- Tone-specific scoring must be empirically validated; missing provider dimensions should display as unavailable rather than fabricated.

**Acceptance:** Speaking permission denied produces recoverable UX; assessment failure does not erase recording or progress; successful attempt is visible in history.

### PRD-07 AI language tutor
- Explain word senses, grammar, examples, mistakes and contextual usages in Vietnamese, with Chinese and Pinyin examples.
- AI must distinguish source-derived statements from generated examples and allow user correction.
- AI creates practice from approved vocabulary/lesson content; never cite nonexistent textbook page numbers.

**Acceptance:** Tutor explains a sentence and identifies which vocabulary it is using; generated examples are labeled.

### PRD-08 Import image/text/PDF
- Input via camera/photo/screenshot (browser file picker / camera capture), pasted text and teaching PDF (file picker incl. iOS Files).
- Extract text (PDF text layer first, OCR fallback), segment Chinese words, assign Pinyin/meaning and detect lesson structure when possible.
- Preview extracted content side-by-side with source page, allow correction, selection and dedupe before finalizing.
- Long PDF is a resumable background import with status, partial errors and idempotent retry; uploads are private by default.

**Acceptance:** Import sample PDF -> preview lessons/words -> correct one misread word -> publish -> start quiz; reimport does not duplicate content.

### PRD-09 Gamification
- XP, daily streak, levels, badges and daily goals; timestamps and timezone policy defined for daily activity.
- Rewards tied to actual learning completion; idempotent XP grants prevent exploitation by replays.
- Delivery split (D-003): from M3 onward study flows only **emit learning events**; the XP engine that consumes those events (and back-fills from them) ships in M7.
- Gamification must not override accurate learning assessment.

**Acceptance:** Completed session increments XP once; offline work syncs without double rewards.

### PRD-10 Reminders and review schedule
- Generate due-review schedules based on performance.
- Reminder delivery on the web (D-024): Web Push scheduled by the server (on iPhone only for Home-Screen web apps on iOS 16.4+, after permission) plus in-app reminders. Review schedules are computed correctly offline; only notification delivery needs the server/network.
- Respect user notification preferences, quiet hours, permissions and local timezone.

**Acceptance:** User can disable reminders; scheduling remains correct after timezone change and offline periods; on an iPhone Home-Screen install with permission granted a due-review push arrives; without permission the in-app reminder still shows.

### PRD-11 Learning Library & textbook import
- Create course -> chapter -> lesson -> sections (vocabulary, grammar, conversation, exercise, source pages).
- Import initial HSK 3.0 PDF only after app is built; tests must use appropriately licensed synthetic/sample PDF.
- Additional textbooks added as new courses or versions, without app release.
- Courses have provenance, source PDF reference, private/public access control and import/review workflow.
- Shared vocabulary dictionary links multiple lessons and books without duplicating personal learning history.

**Acceptance:** Import two sample PDFs containing a common word; the word is shared, source occurrences remain separate, and prior mastery stays intact.

## 3. Core flows

### Onboarding
Open the HTTPS URL in Safari -> (optional, recommended) Add to Home Screen -> sign up/login with e-mail OTP code or password (D-025) -> choose beginner/intermediate, simplified/traditional preference (initial content primarily simplified), study goal -> download starter learning data -> Home.

Starter data is a small fixture with clear origin and usage rights, loaded as ordinary course/lexicon records; HSK 3.0 content is never hard-coded (D-012).

### Daily study
Home -> due review -> answer mixed quiz -> enter/import daily words -> dictionary/etymology -> handwriting practice -> listening/speaking -> session summary and next review.

### PDF import
Library -> add PDF -> private file upload -> queued processing -> extraction and lesson outline -> user review & corrections -> publish selected lessons -> browse / study -> future updates versioned.

### Offline
Download relevant lessons/cards/audio -> app loses connection -> quizzes/dictionary/strokes work locally -> queue immutable mutations -> connectivity returns -> authorized replay to server -> conflict resolution and confirmation. AI cloud services require online connection.

## 4. Information architecture (screens)

- Splash / onboarding / login / account settings
- Home dashboard: today plan, due words, streak, next lesson
- Library: courses, chapters, lessons, import job status and approval
- Lesson: vocabulary, grammar, conversations, exercises, source references
- Dictionary: search, details, Hanzi history and animation, personal notes
- Practice: quiz selection, handwriting canvas, listening, dictation, speaking
- AI tutor: text chat and live conversation
- Progress: mastered words, speaking trend, XP, streak, achievements
- Settings: language, audio, privacy, downloads, notifications, export/delete account

Primary bottom navigation proposal: Home / Library / Dictionary / Practice / Profile; AI tutor entry can be contextual.

## 5. Key quality requirements

- Mobile-first, touch-first, responsive and accessibility-aware layout (respects text size settings, contrast, VoiceOver labels, safe-area insets, no zoom-on-focus).
- Next.js web app + PWA (manifest, service worker, offline shell); acceptance is on real iPhone Safari (browser tab and Home-Screen mode), not only desktop or simulators.
- Same codebase serves Android/desktop browsers, but iPhone Safari is the initial release gate.
- Offline data in IndexedDB is minimised; sensitive fields are encrypted with a non-extractable Web Crypto key, with documented limits (D-022); sessions handled by Supabase Auth; do not persist audio or other sensitive data locally unless required; protect private PDF/audio; logout clears local data.
- No long-lived provider secrets in client. AI APIs via authenticated backend; time-limited voice session credentials where supported.
- Supabase Row Level Security and automated negative authorization tests; no cross-user vocabulary/progress leaks.
- Data deletion/export, private document visibility, input sanitization, file-size/type validation, abuse/expense limits.
- Background jobs handle expensive PDF ingestion; observability, retry policy, idempotency and cost tracking.
- Reproducible cloud builds and migrations, CI tests and rollback plan.
- Require clear, testable performance targets established with device/load testing, rather than invented guarantees.

## 6. Open questions tracked without blocking foundation

- Release distribution: private beta on an HTTPS URL (invite-only accounts) before public launch; custom domain to be chosen.
- Exact course PDF file structure, scan quality and copyright status (not yet supplied; imported by the owner after the app is complete).
- Chinese simplified-first and optional traditional display rules.
- Detailed XP formula, tone scoring rubric and notification defaults (to validate with test users).
- Pricing/billing/cost caps; no commitment to numerical budgets without usage tests.

## 7. Definition of product done

- On a real iPhone, the PWA opens in Safari and from the Home Screen, authenticates, studies, reviews and syncs real data, including after offline use.
- 11 modules have implemented acceptance criteria or explicitly documented release-stage gates; no mocked backend masquerading as production.
- Sample PDF ingest is end-to-end verified; HSK PDF import can be performed afterward without new code.
- Offline sync conflict and no-data-loss tests pass.
- All permissions, privacy controls and AI network failures handled.
- A new quiz type and content course can be introduced without editing existing type-specific logic or hard-coded content.
