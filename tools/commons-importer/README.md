# Commons importer (Task B, standalone)

Isolated, dependency-free Node ESM tool. Not wired into turbo/CI/web. Tests: `node --test test/*.test.mjs`.

- `src/client.mjs` — Commons Action API client (injected fetch, pagination via `continue`, hard request budget, optional disk cache, offline mode, https `upload.wikimedia.org` downloads only, no retry).
- `src/licence.mjs` — allowlist CC0 / PD / CC BY / CC BY-SA; NC, ND, GFDL, unknown, missing => rejected.
- `src/sanitize.mjs` — strict element/attribute allowlist; rejects scripts, foreignObject, image/use, href, style, event handlers, external url(), DOCTYPE/ENTITY, char refs.
- `src/importer.mjs` — deterministic manifest (sorted), per-file licence/author/revision/sha1/sanitized sha256, dedupe, dry-run, incremental reuse (upstream sha1 + revid unchanged).
- `src/cli.mjs` — `node src/cli.mjs --category "Category:..." --ua "name (contact)" [--out dir] [--dry-run] [--offline]`.

Limits: fixtures are SYNTHETIC (not historical data). Importer never maps file→character/stage (`character`/`stage` stay null for curation) and reports no coverage. No live Commons run was performed. Category names/licence metadata still need live verification. Share-alike/attribution flags are recorded; rendering attribution is a UI task.
