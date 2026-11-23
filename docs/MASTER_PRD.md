# Mandarin AI — Master Product Requirements Document

Version: 1.2 | Date: 2026-11-23 | Status: Product requirements approved; implementation pending

## 1. Product definition

Mandarin AI is an iOS-first Chinese learning application for Vietnamese-speaking learners. Android is a planned platform using the same React Native codebase. The product starts with learner-imported HSK 3.0 teaching PDFs after the app is built; future textbooks must be addable without code changes. The learning experience is powered by a personal vocabulary dictionary, spaced-repetition reviews, handwriting games, listening and speaking practice, and explanations of Hanzi evolution grounded in verifiable historical sources.

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
- Shipping all Android-specific integrations before the iOS acceptance criteria are met.

## 2. Confirmed product scope (11 domains)

### PRD-01 Daily vocabulary intake
- Learner can input Chinese word or character, Pinyin, Vietnamese meaning and optional example/notes; app offers suggestions but does not silently overwrite user data.
- Entries have a stable canonical vocabulary identity and individual ownership metadata.
- Each addition links to study date, optional lesson/course/topic and provenance.
- Duplicate detection suggests merge/link instead of deleting or repeating an existing entry.

**Acceptance:** User adds five words; app restarts and all five persist; adding a known word from another lesson links the lesson rather than duplicating the personal dictionary entry.

### PRD-02 Personal dictionary
- Search by simplified/traditional Hanzi, diacritic or numbered Pinyin, and Vietnamese meaning (accent-insensitive search is a target).
- Show pronunciation, examples, meanings, tags, course/lesson occurrences and individual learning history.
- Edit personal notes, manage topics and filter by due review or mastery.
- Distinguish a multi-character word from its component Hanzi; one character may have its own etymology resource.

**Acceptance:** User finds 山 via 山, shan1 and núi; sees all lessons referencing the character and prior attempts.

### PRD-03 Hanzi visual etymology
- Display real-world reference imagery, explanation of graphic formation, verified historical attested forms when available, and transitions/animations to modern script.
- Historical forms must have source, script stage, provenance and review status.
- Do not claim all characters are pictographs or that every historical stage is known. Where evidence is insufficient, clearly say so.
- Cache historical media for reused characters rather than regenerating per lesson.

**Acceptance:** 山 detail shows sourced historical stages, user-friendly explanations, animation, and provenance; an unsupported form is not invented.

### PRD-04 Quiz & spaced repetition
- Quiz types: meaning recognition, Hanzi recognition, Pinyin matching, audio recognition, dictation, handwriting answer.
- New words receive same-day quick practice; previous days' due words are included based on a documented scheduling algorithm.
- Persist per-item attempts and use them to compute next review, avoiding double credit for repeat submissions.
- Quiz session survives app interruption and resume.

**Acceptance:** Failed word becomes due sooner than a successfully recalled word; past-day cards appear even when new words are added.

### PRD-05 Hint-to-handwriting mini game
- Present a picture or Vietnamese meaning; user must recall the matching Chinese character and draw it using finger/stylus.
- Never reveal the target character before answer submission; show model and stroke guidance afterward.
- Collect vector strokes (coordinates, timestamps); use Google ML Kit Digital Ink recognition, not image OCR, for candidate character recognition.
- Record recognizer confidence/candidates and allow a retry or manual appeal; do not equate recognition alone with perfect stroke order.
- Start with single-character prompts, then extend to words/phrases via plugin-type quiz contracts.

**Acceptance:** User sees mountain image, writes 山, gets verified recognition/feedback; wrong candidate does not count as correct; result syncs.

### PRD-06 Listening and speaking
- Listen to word/sentence/audio at normal and slower playback speeds.
- Listening exercise: select meaning, identify spoken word, or write dictated Hanzi.
- Speaking: record and replay, submit against a known reference phrase for Azure AI Speech pronunciation assessment; show available assessment dimensions and constructive Vietnamese feedback.
- AI role-play: real-time/turn-based Chinese conversations using OpenAI, constrained by learner level and recently learned vocabulary.
- Store attempt metadata, scores where provider supports them, feedback and recurring difficulties; raw recordings retention is configurable and minimized.
- Tone-specific scoring must be empirically validated; missing provider dimensions should display as unavailable rather than fabricated.

**Acceptance:** Speaking permission denied produces recoverable UX; assessment failure does not erase recording or progress; successful attempt is visible in history.

### PRD-07 AI language tutor
- Explain word senses, grammar, examples, mistakes and contextual usages in Vietnamese, with Chinese and Pinyin examples.
- AI must distinguish source-derived statements from generated examples and allow user correction.
- AI creates practice from approved vocabulary/lesson content; never cite nonexistent textbook page numbers.

**Acceptance:** Tutor explains a sentence and identifies which vocabulary it is using; generated examples are labeled.

### PRD-08 Import image/text/PDF
- Input via camera/photo/screenshot, pasted text and teaching PDF.
- Extract text (PDF text layer first, OCR fallback), segment Chinese words, assign Pinyin/meaning and detect lesson structure when possible.
- Preview extracted content side-by-side with source page, allow correction, selection and dedupe before finalizing.
- Long PDF is a resumable background import with status, partial errors and idempotent retry; uploads are private by default.

**Acceptance:** Import sample PDF -> preview lessons/words -> correct one misread word -> publish -> start quiz; reimport does not duplicate content.

### PRD-09 Gamification
- XP, daily streak, levels, badges and daily goals; timestamps and timezone policy defined for daily activity.
- Rewards tied to actual learning completion; idempotent XP grants prevent exploitation by replays.
- Gamification must not override accurate learning assessment.

**Acceptance:** Completed session increments XP once; offline work syncs without double rewards.

### PRD-10 Reminders and review schedule
- Generate due-review schedules based on performance.
- Local notifications for offline device reminders; cloud push can be added without rewriting scheduling logic.
- Respect user notification preferences, quiet hours, permissions and local timezone.

**Acceptance:** User can disable reminders; scheduling remains correct after timezone change and offline periods.

### PRD-11 Learning Library & textbook import
- Create course -> chapter -> lesson -> sections (vocabulary, grammar, conversation, exercise, source pages).
- Import initial HSK 3.0 PDF only after app is built; tests must use appropriately licensed synthetic/sample PDF.
- Additional textbooks added as new courses or versions, without app release.
- Courses have provenance, source PDF reference, private/public access control and import/review workflow.
- Shared vocabulary dictionary links multiple lessons and books without duplicating personal learning history.

**Acceptance:** Import two sample PDFs containing a common word; the word is shared, source occurrences remain separate, and prior mastery stays intact.

## 3. Core flows

### Onboarding
Install TestFlight build -> sign up/login -> choose beginner/intermediate, simplified/traditional preference (initial content primarily simplified), study goal -> create/download starter learning data -> Home.

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

- iOS-first, touch-first and accessibility-aware layout (dynamic type, contrast, VoiceOver labels).
- React Native Expo Development Build and EAS iOS/TestFlight; no Expo Go-only acceptance.
- Android-ready codebase, but iOS functionality is the initial release gate.
- Offline local data encrypted where sensitive; secure credential storage; protect private PDF/audio.
- No long-lived provider secrets in client. AI APIs via authenticated backend; time-limited voice session credentials where supported.
- Supabase Row Level Security and automated negative authorization tests; no cross-user vocabulary/progress leaks.
- Data deletion/export, private document visibility, input sanitization, file-size/type validation, abuse/expense limits.
- Background jobs handle expensive PDF ingestion; observability, retry policy, idempotency and cost tracking.
- Reproducible cloud builds and migrations, CI tests and rollback plan.
- Require clear, testable performance targets established with device/load testing, rather than invented guarantees.

## 6. Open questions tracked without blocking foundation

- Release distribution: TestFlight private beta before public App Store.
- Exact course PDF file structure, scan quality and copyright status (not yet supplied).
- Chinese simplified-first and optional traditional display rules.
- Detailed XP formula, tone scoring rubric and notification defaults (to validate with test users).
- Pricing/billing/cost caps; no commitment to numerical budgets without usage tests.

## 7. Definition of product done

- iOS device TestFlight build installs, authenticates, studies, reviews and syncs real data.
- 11 modules have implemented acceptance criteria or explicitly documented release-stage gates; no mocked backend masquerading as production.
- Sample PDF ingest is end-to-end verified; HSK PDF import can be performed afterward without new code.
- Offline sync conflict and no-data-loss tests pass.
- All permissions, privacy controls and AI network failures handled.
- A new quiz type and content course can be introduced without editing existing type-specific logic or hard-coded content.
