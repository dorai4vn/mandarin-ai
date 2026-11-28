# Mnemonic artwork CLI (M3.5, personal-use-first)

One on-demand script, not a queue/worker/admin platform. Reads `apps/web/src/hanzi/beginner200.json`.

```
pnpm mnemonic-art review                       # lint briefs + Vietnamese content (exit 1 on errors)
pnpm mnemonic-art plan --only 山,水            # DRY-RUN (default): shows what would be generated
pnpm mnemonic-art generate --ids 1-10 --mock   # synthetic mock provider, writes to .mnemonic-art/ only
pnpm mnemonic-art generate --ids 1-10 --live --max-spend-usd 1   # real calls (see gates)
pnpm mnemonic-art generate --only 水 --force --live ...          # explicit regeneration
pnpm mnemonic-art verify                       # re-check checksums of stored files
```

A selection (`--only`, `--ids` or `--all`) is mandatory; nothing runs on "everything" implicitly.

## Behaviour

- **Generate missing**: skips entries whose manifest status is `stored`, prompt hash unchanged and stored file checksum matches.
- **Optimise**: output normalised to 1600x1200 WebP (quality 82, `fit: cover`) with `sharp`, pinned as exact root
  devDependency `sharp@0.35.5` (`pnpm install`; lockfile committed). A test runs real sharp on a synthetic PNG. Output is rejected unless it is WebP with exact dimensions.
- **Storage** (`--storage local|supabase`, default `local`): local mock (`.mnemonic-art/store/`, gitignored) with the same `put(path, body, contentType)` shape as
  `ObjectStoragePort`. Uploads are read back and checksum-verified. `--storage supabase` is opt-in and reads
  `MNEMONIC_SUPABASE_URL`, `MNEMONIC_SUPABASE_SECRET_KEY`, `MNEMONIC_SUPABASE_BUCKET` (private bucket, never printed);
  it follows the same REST contract as `packages/adapters/src/server/supabase-storage.ts` (re-implemented in plain
  Node because that adapter is TypeScript - keep in sync) plus an authenticated GET for checksum readback. It is only
  tested against a mocked transport; **no cloud write has ever been made**. Uploads use `x-upsert: false`, so
  `--force` regeneration of an already-uploaded object needs the old object deleted first (fails fatally, no re-billing).
- **Resumable manifest**: `.mnemonic-art/manifest.json`, written atomically after every state change.
- **No duplicate requests**: an entry left in `requested` (crash after a possibly billed call) is blocked until `--force`.
  A tampered/missing stored file is blocked until `--force`.
- **Bounded retries**: 0-3 (default 2), only for network/429/5xx, exponential backoff. Every attempt counts toward spend.
- **Spend guard**: `--max-spend-usd` required; refuses up-front if spent + planned > cap; cumulative across runs.

## Gates before any real call

Real calls need `--live` plus ALL of these env vars (values are never printed; keep them out of git):

| Var                                                                            | Meaning                                                  |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `MNEMONIC_IMAGE_API_KEY`                                                       | provider key                                             |
| `MNEMONIC_IMAGE_MODEL`                                                         | model id                                                 |
| `MNEMONIC_INPUT_USD_PER_M`, `MNEMONIC_OUTPUT_USD_PER_M`                        | text-input / image-output USD per 1M tokens **verified by a human** (docs list $5 / $30 standard for gpt-image-2.6-flare/sunburst; I could not confirm the 2.6 rows from the pricing page I fetched, which showed GPT Image 2 at $8 image-in / $30 image-out) |
| `MNEMONIC_MAX_INPUT_TOKENS`, `MNEMONIC_MAX_OUTPUT_TOKENS`                      | per-call token ceilings; per-call bound = in*rateIn + out*rateOut. The docs fetched give NO output-token count per size/quality, so these must come from the image guide / a measured first call |
| `MNEMONIC_IMAGE_QUALITY`                                                       | low\|medium\|high (default medium) |
| `MNEMONIC_PRICING_SOURCE_URL`, `MNEMONIC_PRICING_VERIFIED_ON`                  | https URL and YYYY-MM-DD of that check                   |

No price is hard-coded and there is no fixed per-image price: models are token-priced, so the CLI uses a conservative per-call
CEILING computed from owner-supplied rates and token ceilings (`tokenCostBound`); live is refused if any figure is missing.
It is not a provider-enforced hard cap; the real cap is `--max-spend-usd` (<= 1) counted per attempt at the ceiling, plus
retries 0 in the workflow. Actual `usage` from the response is recorded in the manifest for comparison.
Model allowlist: `gpt-image-2`, `gpt-image-2.5-{flare,sunburst}`, `gpt-image-2.6-{flare,sunburst}` (+dated snapshots); `gpt-image-1`
(retired) and `dall-e-*` are rejected. Request: `size 1536x1024`, `quality low|medium|high`, `output_format png`, no `response_format`;
3:2 output is cover-cropped to 4:3. This follows the API reference text only - **live compatibility is NOT verified**.
Hard pilot caps in code: `--max-spend-usd` <= 1 (incl. retries, each attempt counted) and <= 10 images per live run.
Use a separate OpenAI project/key for this CLI.
**
### Run #1 (46057258136) failure and replacement steps
Run 46057258136 failed in the Validate step (`[[ =~ [^[:ascii:]] ]]` is an invalid bash character class); Generate was skipped, so no paid call happened and no artifact exists.
Fixed in the launcher draft: Hanzi validation is `python3 -I` stdlib (CJK Unified Ideograph check, tested in a real shell by `workflow.test.mjs`), `gh` calls use explicit `--repo`,
Verify/Upload only run when setup succeeded and `.mnemonic-art/manifest.json` exists (the spend ledger rules are unchanged).
That failed run would otherwise block `first_run=true` forever, so the launcher has input `recover_run_id`, accepted **only** for the hardcoded `46057258136` with `first_run=true`;
it is honoured only if the jobs API (`filter=all`, every rerun attempt) proves the `Generate` step was skipped, the run is a completed failure of this workflow with zero artifacts. Anything else fails closed. Other prior runs still block (no general bypass).
Limitation: any future run that fails before Generate also blocks until the owner changes the launcher; a rerun of 46057258136 uses the old file and fails the same way, do not rerun it.
Owner steps: (1) replace `.github/workflows/mnemonic-art-pilot.yml` on main with `docs/workflow-drafts/mnemonic-art-pilot.yml` from the new reviewed SHA; (2) dispatch from main with `reviewed_sha` = that SHA,
`only=山`, `first_run=true`, `recover_run_id=46057258136`, `previous_run_id` empty, cap 1; (3) approve the environment; (4) next runs: `first_run=false`, `previous_run_id` = latest run, no recover id.
Not verified on GitHub: the workflow has still never completed a real dispatch; `gh` was stubbed in tests.

No real API call has been made.** Generated images are candidates: they stay `pending-artwork` until the owner approves.

## Brief review (before spending)

`review` flags errors (too short, abstract wording, Hanzi inside brief, missing Vietnamese gloss) and warnings
(no explicit light/material cue; the global style prompt supplies these). Current result: 0 errors,
see CLI output for warnings. Two weak briefs (小, 好) were rewritten. A manual pass over all 200 meanings/pinyin/examples found one concrete error
(爱 example 爱人 glossed as "người yêu"; in Mandarin it means spouse -> replaced by 爱好 "sở thích"). Remaining uncertainty:
no native-speaker or dictionary cross-check; tone-sandhi pinyin (一/不) and glosses are from author knowledge only.

## Tests

`pnpm test:mnemonic-art` (node:test, 28 cases incl. CLI guards and workflow structure (mocked transport, real sharp on a synthetic fixture), synthetic fixtures, no network).

## Pricing bound for one low/medium image (investigated 2026-11-27, official docs only)

Sources: https://developers.openai.com/api/docs/pricing (Image generation, Standard) and
https://developers.openai.com/api/docs/guides/image-generation (cost section).

- `gpt-image-2`, `gpt-image-2.5-{flare,sunburst}`, `gpt-image-2.6-{flare,sunburst}`: text input $5.00/M, image input $8.00/M, image output $30.00/M.
  Pricing page states there is **no per-image price table**; it points to an interactive calculator (values not retrievable as text).
- The guide's "Output tokens per image" table (1536x1024: low 400, medium 1568, high 6208) is labelled **for models prior to `gpt-image-2`**.
  Its "historical output cost" row for GPT-Image-2 at 1536x1024 gives low $0.005, medium $0.041, high $0.165 (output only).
- For `gpt-image-2.5`/`2.6` the guide says only "Image output costs $30 per million billable tokens" and gives **no token count or per-image figure**.

Conclusion:
- **`gpt-image-2`, 1536x1024, low/medium: defensible bound.** Use ceilings from the documented table with margin:
  `MNEMONIC_OUTPUT_USD_PER_M=30`, `MNEMONIC_INPUT_USD_PER_M=5`, `MNEMONIC_MAX_OUTPUT_TOKENS=1568` (medium) or `400` (low), `MNEMONIC_MAX_INPUT_TOKENS=1500`
  (the brief + style prompt is well under that; ~$0.0075) -> per-call ceiling ~ $0.055 (medium) / ~$0.020 (low). Caveat: the token table is for
  pre-`gpt-image-2` models, so treat it as an estimate and compare with the `usage` recorded in the first run's manifest before any further run.
- **`gpt-image-2.5` / `2.6`: BLOCKER.** No documented output-token ceiling; the cost is not boundable from docs. Do not dispatch with these until the owner
  measures one image (or the calculator value is read manually from the guide) and records it. The CLI refuses live unless every figure is supplied.
- Recommended first run: `MNEMONIC_IMAGE_MODEL=gpt-image-2`, quality `low`, one image (山). Not a provider-enforced hard cap; the only true cap is the provider-side project limit.

## Manual artwork workflow (DRAFT launcher, not active)

`docs/workflow-drafts/mnemonic-art-pilot.yml` - the GitHub App cannot write `.github/workflows`, so the owner copies **only this file** to
`.github/workflows/` on main. It is a minimal launcher: no app/production code changes, PR30 does **not** need to be merged first.

- `workflow_dispatch` only (no PR/comment triggers); `github.ref == refs/heads/main`, actor and triggering actor `dorai4vn`; environment `mnemonic-art-pilot` (required reviewer).
- Checks out the exact commit typed in `reviewed_sha` (40-hex, verified `HEAD == reviewed_sha`). **Trust note:** that commit's code runs in the job holding the key, so
  the owner must review that exact SHA (the CLI and this workflow's tests are in it). Dispatch inputs reach shell only through env.
- All actions pinned to commit SHAs (checkout v4.2.2, setup-node v4.4.0, upload-artifact v4.6.2, pnpm/action-setup v4.1.0); token `contents: read` + `actions: read`.
- Secret `MNEMONIC_IMAGE_API_KEY` only in the Generate step (retries 0); offline tests/review/plan run first without it.
- Artifact `mnemonic-art-pilot` uses `include-hidden-files: true` (otherwise the `.mnemonic-art/` dot-directory is silently skipped) and `if-no-files-found: error`.
- **Ledger provenance (no accidental fresh manifest):** `first_run=true` is refused if any earlier non-skipped run exists; otherwise `previous_run_id` is required and must be the
  *latest* prior run; the manifest must be restored and the CLI is called with `--expect-manifest existing|none`. Each live run appends `{runId, commit, spent}` to `manifest.runs`.
  A cancelled/failed latest run without an artifact blocks further runs until the owner resolves it (conservative).
- Offline checks: `pnpm test:mnemonic-art` (28 tests: CLI guards + structural assertions on the draft). The workflow itself has never run on GitHub; the structural tests do not replace a real dispatch.

Safe dispatch prerequisites (all owner actions):
1. Copy the launcher to `.github/workflows/` on main (agent never merges). Reviewed commit = the branch tip you typed in `reviewed_sha`.
2. Create Environment `mnemonic-art-pilot` with owner as required reviewer; keep `MNEMONIC_IMAGE_API_KEY` there if possible (separate OpenAI project with a provider-side spend limit).
3. Set Variables from the pricing section above (`gpt-image-2` recommended), `MNEMONIC_PRICING_SOURCE_URL`, `MNEMONIC_PRICING_VERIFIED_ON`.
4. Run 1: `first_run=true`, `only=山`, quality `low`, cap 1. QC the artifact and compare manifest `usage`. Run 2+: `previous_run_id` = latest run.

### Run #1 (46057258136) failure and replacement steps
Run 46057258136 failed in the Validate step (`[[ =~ [^[:ascii:]] ]]` is an invalid bash character class); Generate was skipped, so no paid call happened and no artifact exists.
Fixed in the launcher draft: Hanzi validation is `python3 -I` stdlib (CJK Unified Ideograph check, tested in a real shell by `workflow.test.mjs`), `gh` calls use explicit `--repo`,
Verify/Upload only run when setup succeeded and `.mnemonic-art/manifest.json` exists (the spend ledger rules are unchanged).
That failed run would otherwise block `first_run=true` forever, so the launcher has input `recover_run_id`, accepted **only** for the hardcoded `46057258136` with `first_run=true`;
it is honoured only if the jobs API (`filter=all`, every rerun attempt) proves the `Generate` step was skipped, the run is a completed failure of this workflow with zero artifacts. Anything else fails closed. Other prior runs still block (no general bypass).
Limitation: any future run that fails before Generate also blocks until the owner changes the launcher; a rerun of 46057258136 uses the old file and fails the same way, do not rerun it.
Owner steps: (1) replace `.github/workflows/mnemonic-art-pilot.yml` on main with `docs/workflow-drafts/mnemonic-art-pilot.yml` from the new reviewed SHA; (2) dispatch from main with `reviewed_sha` = that SHA,
`only=山`, `first_run=true`, `recover_run_id=46057258136`, `previous_run_id` empty, cap 1; (3) approve the environment; (4) next runs: `first_run=false`, `previous_run_id` = latest run, no recover id.
Not verified on GitHub: the workflow has still never completed a real dispatch; `gh` was stubbed in tests.

No real API call has been made.

## Scope migration (2026-11-27): production = the 246 active syllabus-L1 characters

- `--all` selects only **active** records (`set: syllabus-l1`, 246). Archive records (`set: extension`, 40) are never part of production and `--production` rejects any archive selection.
- Retained images: 10 (`meta.retainedPilot.files`): 水火日月人雨 (active) + 山木鱼鸟 (archive). New images needed: 246 - 6 = **240**.
- **Carried-ledger guard** (`verifyCarriedLedger`, runs for production incl. dry-run, fails closed, no network): all 10 retained entries must be `stored`, checksum-valid in storage, with `promptHash` equal to the dataset's current prompt
  (v1 frozen for 山水木火日月鱼鸟; v2 for 人 and 雨, unchanged); no `requested`/`failed` entries; no orphan entries; at least 12 prior requests (stored + archived revisions); and `spentUsdEstimated` not lower than the sum of
  prices the entries themselves prove. In addition (hardening): every `entry.history[].archivedAt` superseded file must have a safe `mnemonic/superseded/<12hex>-<name>.webp` path, exist, and match its SHA-256; stored entries must match the dataset (hanzi, path `mnemonic/<file>`, finite non-negative price); and the three original runs pinned in `meta.retainedPilot.priorRuns` (46058598242, 46059449724, 46063520659: runId, commit, `only`, spentUsdEstimatedAfter 0.0195 / 0.195 / 0.234, copied from the real GitHub artifact manifest) must be an unchanged, ordered prefix of `manifest.runs`; later production run records may append. `spentUsdEstimated` may not be below 0.234. A missing or tampered manifest stops the run before any call. The manifest format is unchanged (keyed by file name), so no data migration exists to get wrong: spend and entries carry over byte-for-byte (tested).
- Budget: sanity ceiling lowered to **$6 cumulative ESTIMATED** (owner-approved). It is a typo guard and ledger bound, **not** a provider-enforced cap; set a provider-side project limit.
- Not verified here: the actual artifact of run 46063520659 and actual provider billing (tests use synthetic fixtures only). The first dispatch will verify the real artifact through this guard.
- Minimal owner steps: (1) review/merge the draft; (2) copy the production launcher draft per its header; (3) dispatch with `previous_run_id` = latest run, `first_run=false`; (4) the launcher itself runs `plan --all --production --expect-manifest existing --batch-size N --max-spend-usd B` before the secret-bearing Generate step (no spend, no API key). It receives only the NON-SECRET, owner-configured pricing variables (`MNEMONIC_INPUT_USD_PER_M`, `MNEMONIC_OUTPUT_USD_PER_M`, `MNEMONIC_MAX_INPUT_TOKENS`, `MNEMONIC_MAX_OUTPUT_TOKENS`, `MNEMONIC_PRICING_SOURCE_URL`, `MNEMONIC_PRICING_VERIFIED_ON`), computes the same conservative `tokenCostBound()` as live mode, and fails closed if any is missing/invalid. It checks the carried-ledger guard and the **projected cumulative estimate for ALL remaining active characters** (`spentUsdEstimated + remainingActive x bound <= budget`, independent of `batch_size`; e.g. 0.234 + 240 x 0.0195 = 4.914: passes at $6, fails at $4.90) and expects `toGenerate+deferred = 240`. The per-dispatch live batch guard still applies afterwards. The result is only as good as the owner-set pricing variables; it is an estimate ceiling, NOT a provider-enforced cap (the budget is not a provider limit).

## Production mode for the remaining images (DRAFT, no live calls made)

Prerequisites: owner has QC'd the pilot (10 retained images) and given a **separate final budget approval**. Pilot #3 stays on the pilot launcher with `previous_run_id=46058598242`.

CLI: `generate --all --production --live --expect-manifest existing --batch-size N --max-spend-usd B`
- Requires the carried manifest with >= 10 stored images (the pilot); verified entries are skipped (same prompt hash + checksum), so reruns never repeat paid calls.
- Serial, **retries forced to 0**, batch of at most `N` (1-200) new images per run; `deferred` in the summary = still missing, continue by re-dispatching with the latest run id.
- **Stops on the first error**; the failed entry (possibly billed) and any `requested` entry are `blocked` on rerun until the owner uses `--force --only X`.
- Budget `B` is cumulative across all runs (carried `spentUsdEstimated`) and is checked before every call. `B <= 6` is only a typo guard. It is **not** a provider-enforced cap
  (do not assume $5 is a hard cap; set the provider-side project limit). The estimate uses the token ceiling bound; when the response has `usage`, actual cost at the same owner-verified rates
  is stored per entry (`usageCostUsd`) and summed in `spentUsdActualReported` / summary `actualUsdReported`. Actual billing is still not independently verified.
- Quality is fixed `low` in the workflow and the model must equal the model recorded in the carried manifest (checked offline before the secret step).

Draft launcher: `docs/workflow-drafts/mnemonic-art-production.yml` (not in `.github/workflows`; owner copies it after approval). Same guards as the pilot launcher (dispatch only, owner-only, read-only
token, pinned actions, exact reviewed SHA, secret in Generate only, hidden-file artifact uploaded also on failure) plus the reused protected environment `mnemonic-art-pilot` (owner as required reviewer),
shared concurrency group and artifact name with the pilot (one ledger chain; `previous_run_id` must be the latest run across both launchers), timeout 340 min.
Environment: the production draft now REUSES `mnemonic-art-pilot` (see "QC revision" below for why that is safe and what differs). Never run live from CI of this repo.
Tests: `pnpm test:mnemonic-art` (49 offline tests; the workflow has never run on GitHub).

## Node24 action pins (draft launchers)

Verified 2026-11-27 via `git ls-remote` + upstream `action.yml` `runs.using`:

| Action                  | Pin (commit)                               | Tag | Runtime                            |
| ----------------------- | ------------------------------------------ | --- | ---------------------------------- |
| actions/checkout        | fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09   | v5  | node24                             |
| actions/setup-node      | a0853c24544627f65ddf259abe73b1d18a591444   | v5  | node24                             |
| pnpm/action-setup       | fc06bc1257f339d1d5d8b3a19a8cae5388b55320   | v5  | node24 (annotated tag, peeled SHA) |
| actions/upload-artifact | b7c566a772e6b6bfb58ed0dc250532a479d7789f   | v6  | node24 (v5 is still node20)        |

Application Node stays 22 (`node-version: 22`). Covered by `node24-pins.test.mjs`.

## QC revision of 人 and 雨 (owner decision 2026-11-27)

Owner accepted 8 pilot images (山 水 木 火 日 月 魚→鱼 鳥→鸟) and asked to revise **人** (large unmistakable human subject, scenery subordinate)
and **雨** (clearly visible falling rain, not primarily a thunderstorm). No live call was made in this checkpoint.

**Prompt versions (accepted hashes are not invalidated)**
- `artwork.promptVersion: "v1"` = frozen legacy prompt, byte-identical to what produced the accepted images. Their `promptHash` values are pinned by a golden test
  (`lib.test.mjs`), so a rerun skips them (`skip-verified`) and never re-bills them.
- Everything else (人, 雨 and every not-yet-generated active character) uses **v2** = v1 + one extra line, *thumbnail legibility*: main subject unmistakable at ~160 px wide, dominant (>= half of frame height),
  simple silhouette, strong value contrast, calm subordinate background, minimal clutter. v2 applies to all remaining production images.
- New briefs: 人 = one large profile figure striding in a dark wool coat, rim backlight, blurred subordinate lane; 雨 = dense long bright backlit rain streaks on dark slate sky, splashing on wet stone, no lightning.
  Original text; no Hanzi inside the artwork; the pilot's 山 style/model/quality (`low`) are unchanged.

**Explicit revise flag**: a stored image whose prompt hash changed is now `blocked-revision-needs-flag` (previously it silently regenerated = silent spend).
`--revise` (pilot launcher input `revise=true`, needs `first_run=false`) regenerates only the *selected* changed entries, first copies the old bytes to
`mnemonic/superseded/<sha12>-<file>` (inside the artifact) and records them in `entry.history` (sha256, promptHash, storedAt, estimated/usage cost), then stores the new image under the
same filename. It refuses if the stored file is missing/tampered. `--revise` is rejected with `--production`. Cumulative `spentUsdEstimated` carries over; a rerun skips (no duplicate spend).
Expected extra spend: 2 x ~$0.0195 estimated (ledger estimate, actual billing not independently verified); cumulative pilot cap stays <= $1.

**Exact dispatch steps (owner; nothing runs until you do these)**
1. Review the tip SHA of this branch (it contains `scripts/mnemonic-art` + new briefs). Copy `docs/workflow-drafts/mnemonic-art-pilot.yml` (updated: `revise` input) to `.github/workflows/mnemonic-art-pilot.yml` on `main` (a launcher-only commit; no app code, PR30 not merged).
2. Actions -> "Mnemonic artwork pilot (manual)" -> Run workflow on `main` with: `reviewed_sha` = that tip SHA, `only` = `人,雨`, `quality` = `low`, `first_run` = false,
   `previous_run_id` = **latest** run (46058598242 unless a later pilot run (e.g. the other 7 pilot images) exists - the run-chain check rejects any other id), `recover_run_id` blank, `revise` = **true**, `confirm_spend_cap` = 1.
3. Approve the `mnemonic-art-pilot` environment after reading the shown inputs. Download artifact `mnemonic-art-pilot`: new `ren-person.webp`, `yu-rain.webp`, old versions under `store/mnemonic/superseded/`, manifest with `history`. QC visually.
4. Only after QC passes and the final budget is approved: production dispatch (below). If a revision is rejected again, adjust the brief, commit, and repeat step 2 with the new SHA and the new latest run id.

**Can the two revisions be combined with the final production dispatch? Not recommended; the tooling prevents it.** `--revise` is refused in `--production`, and production `plan --all` would show 人/雨 as
`blocked-revision-needs-flag` until they are revised. Reason: QC of the revisions before bulk spend (owner preference), a failed/rejected revision would otherwise be mixed into a 240-image batch, and production
stops on the first error. Order: revision run (2 images) -> QC -> production batches (25/50/100/200) with `previous_run_id` = latest.

**Environment reuse (`mnemonic-art-pilot` for both launchers) - safe, with differences**
- Safe because: both launchers are `workflow_dispatch` only, `main` + owner-only guard, read-only token, secret in the Generate step only, shared concurrency group and artifact chain; the same owner is the required reviewer, and the
  API key / pricing vars are scoped once. Approval shows the dispatch inputs (batch size, cumulative budget) either way. No second environment to configure.
- What differs / residual risk: the environment name no longer signals "bigger spend" at the approval prompt (read `Mnemonic artwork production (manual)` and `batch_size`/`confirm_budget_usd` there); the environment cannot enforce the $1 vs
  <= $6 caps - those live in the workflow code at the reviewed SHA; a protection rule or environment secret change affects both launchers. If you prefer a visible separation, create `mnemonic-art-production` and revert that one line.

**Remaining limitations**: workflow never executed on GitHub; golden hashes assume the briefs of the 8 accepted images are unchanged since the pilot run (verify with `plan --only 山,水,木,火,日,月,鱼,鸟` after carrying the manifest: all must say `skip-verified`);
image quality of the revisions is unverified until the owner reviews them; the 188 reviewer warnings (no lighting/texture word in briefs) are unchanged and do not block.
