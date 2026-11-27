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
| `MNEMONIC_PRICE_USD_PER_IMAGE`                                                 | per-image price **verified by a human on the provider's pricing page** |
| `MNEMONIC_PRICING_SOURCE_URL`, `MNEMONIC_PRICING_VERIFIED_ON`                  | https URL and YYYY-MM-DD of that check                   |

The owner's ~$11 budget is an unverified estimate; no price is hard-coded. The provider wrapper builds request bodies per the *documented* OpenAI Images API:
`gpt-image-*` -> `size 1536x1024`, `quality`, no `response_format`; `dall-e-3` -> `1792x1024`, `response_format b64_json`;
`dall-e-2`/unknown models are rejected (square-only/unverified). 3:2 output is cover-cropped to 4:3. This is checked
against documentation and a mocked `fetch` only - **live compatibility is NOT verified**.
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
