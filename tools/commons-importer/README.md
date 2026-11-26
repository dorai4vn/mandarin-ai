# Commons importer (Task B, standalone)

Isolated, dependency-free Node ESM tool. Not wired into turbo/CI/web. Tests: `node --test test/*.test.mjs`.

- `src/client.mjs` — Commons Action API client (injected fetch, pagination via `continue`, hard request budget, optional disk cache, offline mode, https `upload.wikimedia.org` downloads only, no retry).
- `src/licence.mjs` — allowlist CC0 / PD / CC BY / CC BY-SA; NC, ND, GFDL, unknown, missing => rejected.
- `src/sanitize.mjs` — strict element/attribute allowlist; rejects scripts, foreignObject, image/use, href, style, event handlers, external url(), DOCTYPE/ENTITY, char refs.
- `src/importer.mjs` — deterministic manifest (sorted), per-file licence/author/revision/sha1/sanitized sha256, dedupe, dry-run, incremental reuse (upstream sha1 + revid unchanged).
- `src/cli.mjs` — `node src/cli.mjs --category "Category:..." --ua "name (contact)" [--out dir] [--dry-run] [--offline]`.

Limits: fixtures are SYNTHETIC (not historical data). Importer never maps file→character/stage (`character`/`stage` stay null for curation) and reports no coverage. No live Commons run was performed. Category names/licence metadata still need live verification. Share-alike/attribution flags are recorded; rendering attribution is a UI task.

## B2 hardening (this revision)

- Cache: versioned (`CACHE_VERSION`), API JSON expires by TTL (default 24h; `--offline` may use stale by design), file entries keyed by upstream sha1 + URL and re-verified on every read; corrupt/poisoned entries are treated as misses; API errors are never cached.
- Upstream SHA1 (hex, or MediaWiki base36 31-char) verified against raw bytes on download, cache read and in the importer.
- Required provenance: revision id + timestamp, `commons.wikimedia.org/wiki/` source URL, `upload.wikimedia.org/wikipedia/commons/` file URL, sha1.
- Licence: exact Commons short names (`CC BY 4.0`, `CC BY-SA 3.0`, `CC0`, `Public domain`, `PD-*`); versions limited to unported 1.0–4.0; `LicenseUrl` must equal the canonical creativecommons.org URL (PD: empty or PD-mark).
- HTTP: API `error` bodies rejected, redirects refused (`redirect: manual`), per-request timeout, streamed body size caps.
- Incremental reuse needs a verified local file (checksum + re-sanitize); `character`/`stage` mappings carry over only if all evidence (sha1, revision, URLs, author, licence) is unchanged, otherwise dropped and counted in `mappingsDropped`.
- Sanitizer: duplicate attributes and backslash/comment (CSS-escape) values rejected.
  Limits: still no live Commons run; tests use synthetic fixtures. Real Commons `LicenseUrl`/short-name variants may reject legitimate files (fail-closed) — verify on a live dry-run.
