# Visual Mnemonic — artwork integration manifest & checklist

Status: **ALL 10 PENDING. No image file exists in the repo and none is approved.** This document is a
process checklist only; it does not assert that any artwork has been created, licensed or reviewed.
Briefs (art direction, scene per glyph) live in `VISUAL_MNEMONIC_BRIEFS.md`; the code manifest is
`apps/web/src/hanzi/mnemonic.ts`. Actual image assets are produced and supplied separately.

## Manifest (filenames fixed by `MNEMONICS[].assetFile`)

| Glyph | File | Candidate path (owner preview) | Approved path (production) | Status | Owner QC | Approved |
|---|---|---|---|---|---|---|
| 山 | `shan-mountain.webp` | `apps/web/public/mnemonic-candidates/shan-mountain.webp` | `apps/web/public/mnemonic/shan-mountain.webp` | pending — no file | ☐ | ☐ |
| 水 | `shui-water.webp` | `apps/web/public/mnemonic-candidates/shui-water.webp` | `apps/web/public/mnemonic/shui-water.webp` | pending — no file | ☐ | ☐ |
| 木 | `mu-tree.webp` | `apps/web/public/mnemonic-candidates/mu-tree.webp` | `apps/web/public/mnemonic/mu-tree.webp` | pending — no file | ☐ | ☐ |
| 火 | `huo-fire.webp` | `apps/web/public/mnemonic-candidates/huo-fire.webp` | `apps/web/public/mnemonic/huo-fire.webp` | pending — no file | ☐ | ☐ |
| 日 | `ri-sun.webp` | `apps/web/public/mnemonic-candidates/ri-sun.webp` | `apps/web/public/mnemonic/ri-sun.webp` | pending — no file | ☐ | ☐ |
| 月 | `yue-moon.webp` | `apps/web/public/mnemonic-candidates/yue-moon.webp` | `apps/web/public/mnemonic/yue-moon.webp` | pending — no file | ☐ | ☐ |
| 人 | `ren-person.webp` | `apps/web/public/mnemonic-candidates/ren-person.webp` | `apps/web/public/mnemonic/ren-person.webp` | pending — no file | ☐ | ☐ |
| 雨 | `yu-rain.webp` | `apps/web/public/mnemonic-candidates/yu-rain.webp` | `apps/web/public/mnemonic/yu-rain.webp` | pending — no file | ☐ | ☐ |
| 魚 | `yu-fish.webp` | `apps/web/public/mnemonic-candidates/yu-fish.webp` | `apps/web/public/mnemonic/yu-fish.webp` | pending — no file | ☐ | ☐ |
| 鳥 | `niao-bird.webp` | `apps/web/public/mnemonic-candidates/niao-bird.webp` | `apps/web/public/mnemonic/niao-bird.webp` | pending — no file | ☐ | ☐ |

## Per-asset checklist (all must be true before flipping an entry)

1. File is 4:3, 1600×1200, `.webp`, named exactly as above; no text or glyph characters inside the artwork.
2. Original or licence-verified work; record author, licence name, canonical licence URL and provenance
   (how it was made, tool/source, date). No unlicensed or moodboard reference images; no paid image API without owner approval.
3. Placed first under `mnemonic-candidates/`; owner reviews through the lab preview toggle at `/lab/visual-mnemonic`.
4. Composition reinforces the character's structure per the brief; QC a small sample before producing the rest.
5. Alt text (Vietnamese) written; artwork identical in Light and Dark themes (checked in both).
6. Only after explicit owner approval: move to `mnemonic/`, then in `mnemonic.ts` set
   `image` (`src`, `alt`, `width: 1600`, `height: 1200`, `provenance`, `licence`, `licenceUrl`, `author`) and
   `status: 'artwork-approved'`. `validateMnemonics` rejects an image without full provenance, and an approval without an image.
7. Update unit test expectations (currently asserts `image: null` for all) and the `/lab/visual-mnemonic` pending count in the same change.
8. The card keeps the "modern memory aid, not historical evidence" distinction; `isHistoricalEvidence` stays `false`.
