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
**No real API call has been made.** Generated images are candidates: they stay `pending-artwork` until the owner approves.

## Brief review (before spending)

`review` flags errors (too short, abstract wording, Hanzi inside brief, missing Vietnamese gloss) and warnings
(no explicit light/material cue; the global style prompt supplies these). Current result: 0 errors,
see CLI output for warnings. Two weak briefs (小, 好) were rewritten. A manual pass over all 200 meanings/pinyin/examples found one concrete error
(爱 example 爱人 glossed as "người yêu"; in Mandarin it means spouse -> replaced by 爱好 "sở thích"). Remaining uncertainty:
no native-speaker or dictionary cross-check; tone-sandhi pinyin (一/不) and glosses are from author knowledge only.

## Tests

`pnpm test:mnemonic-art` (node:test, 19 cases (mocked transport, real sharp on a synthetic fixture), synthetic fixtures, no network).

## Manual artwork workflow (DRAFT, not active)

`docs/workflow-drafts/mnemonic-art-pilot.yml` - the GitHub App cannot write `.github/workflows`, so the owner must copy it.
Design: `workflow_dispatch` only (no PR/comment triggers, so no agent/PR text reaches it); runs only on `refs/heads/main` by
`dorai4vn`; token `contents: read` + `actions: read`; secret `MNEMONIC_IMAGE_API_KEY` only in the Generate step; inputs validated
and passed via env; retries 0; local candidate artifacts + manifest uploaded (14 days), no cloud writes; `previous_run_id`
restores the manifest so spend accumulates and stored images are not regenerated.

Safe dispatch prerequisites (all owner actions):
1. Review/merge this branch, then copy the draft into `.github/workflows/` on main (agent never merges).
2. Create GitHub Environment `mnemonic-art-pilot` with owner as required reviewer; move `MNEMONIC_IMAGE_API_KEY` there if possible (separate OpenAI project, spend limit set in the provider dashboard - the only true hard cap).
3. Set repository Variables: `MNEMONIC_IMAGE_MODEL`, `MNEMONIC_INPUT_USD_PER_M`, `MNEMONIC_OUTPUT_USD_PER_M`, `MNEMONIC_MAX_INPUT_TOKENS`, `MNEMONIC_MAX_OUTPUT_TOKENS`, `MNEMONIC_PRICING_SOURCE_URL`, `MNEMONIC_PRICING_VERIFIED_ON`, from the pricing page + image guide.
4. Run 1: `only=山`, cap 1. QC the artifact. Run 2+: pass `previous_run_id`, then the remaining nine of the pilot.
Stop condition: if the output-token ceiling cannot be established from docs, do not dispatch - the cost is then unbounded by this tool.
