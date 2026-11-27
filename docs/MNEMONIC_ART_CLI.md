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
- **Optimise**: output normalised to 1600x1200 WebP (quality 82) with `sharp`. `sharp` is NOT a repo dependency;
  install locally for live runs: `npm i --no-save sharp`. Output is rejected unless it is WebP with exact dimensions.
- **Storage**: local mock (`.mnemonic-art/store/`, gitignored) with the same `put(path, body, contentType)` shape as
  `ObjectStoragePort`. Uploads are read back and checksum-verified. Wiring the Supabase adapter is intentionally NOT
  done here (no cloud writes in this checkpoint).
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

The owner's ~$11 budget is an unverified estimate; no price is hard-coded. The provider wrapper targets an
OpenAI-style `/v1/images/generations` endpoint (b64 response) and has only been exercised with a mocked `fetch`.
**No real API call has been made.** Generated images are candidates: they stay `pending-artwork` until the owner approves.

## Brief review (before spending)

`review` flags errors (too short, abstract wording, Hanzi inside brief, missing Vietnamese gloss) and warnings
(no explicit light/material cue; the global style prompt supplies these). Current result: 0 errors,
see CLI output for warnings. Two weak briefs (小, 好) were rewritten. Vietnamese content was only checked
mechanically; a native-speaker read of meanings/examples is still recommended before spending.

## Tests

`pnpm test:mnemonic-art` (node:test, 12 mocked cases, synthetic fixtures, no network).
