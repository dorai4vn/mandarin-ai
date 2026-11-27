# Node 24 action pins for the artwork launcher (draft, not applied)

The GitHub App cannot edit `.github/workflows/`, and the pilot is running, so the change is shipped as
`docs/ci/mnemonic-art-pilot-node24.patch`. The owner applies it after the pilot (`git apply` or manual edit).

Verified via GitHub API on 2026-11-27 (tag -> commit SHA; `runs.using` read from `action.yml` at that commit):

| Action | Current | Proposed | Commit SHA | runs.using |
|---|---|---|---|---|
| actions/checkout | v4.2.2 | v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 | node24 |
| actions/setup-node | v4.4.0 | v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 | node24 |
| actions/upload-artifact | v4.6.2 | v7.0.2 | cf430e030ddbb5b0abf93d22962f4752f3646cd9 | node24 |
| pnpm/action-setup | v4.1.0 | v6.1.1 | 73e46992e05b19abd31f2f3c20e0e7370d762115 (annotated tag 9bbca1e...) | node24 |

Compatibility notes
- upload-artifact v7 still exposes `include-hidden-files`, `if-no-files-found`, `retention-days` (inputs checked), so hidden `.mnemonic-art/` upload is preserved.
- The launcher uses `gh` for restoring prior-run artifacts, not download-artifact; nothing to pin there.
- Application Node stays 22 (`node-version: 22` is unchanged; the action runtime is separate).
- checkout v7 keeps `ref` and `persist-credentials: false`; security controls unchanged.
- NOT verified: a real run with the new pins (no workflow edit/dispatch during pilot). Check pnpm/action-setup v6 against the repo's `packageManager` field on first run.

PR #32 (chore/node24-actions-warning)
- Uses floating tags `@v5` for checkout/setup-node/pnpm and leaves `claude.yml`/`ci.yml` unpinned. v5 is Node24 but older than the latest lines above; suggest aligning to the same pinned SHAs. Not modified here.
- Firefox failure (run 46019601489): `m2-dictionary.spec.ts:70` firefox-mobile, `expect(dialog).toBeHidden()` at line 80 still visible after manual entry (10.8s). This is a dictionary dialog close-timing/behaviour issue unrelated to action versions; needs separate diagnosis (compare with main Firefox runs for flakiness). No test was changed.
