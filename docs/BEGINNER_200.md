# Hanzi dataset: 246 active HSK 3.0 Level 1 + 40 archive (M3.5)

Owner decision 2026-11-27 (scope migration, supersedes the earlier "beginner-200" selection): the **active** set is the official HSK 3.0 **Level 1 recognition characters (246)**;
the **40** earlier-selection characters that are not in that list are **kept as archive** (`set: "extension"`, no HSK level invented). Total **286** unique simplified characters (not words). The file and doc names
keep "beginner200" for stability; ids are stable (1-200 unchanged, 86 new records are 201-286). Personal-use-first.

- Data: `apps/web/src/hanzi/beginner200.json`; types + validator: `beginner200.ts`; the exact source list: `syllabusL1.ts`; tests: `beginner200.test.ts` and `scripts/mnemonic-art/lib.test.mjs`.
- Each row: id, hanzi, **set** (`syllabus-l1` active / `extension` archive), **sourceOrder** (1-246, active only), pinyin, Vietnamese meaning, category, mnemonic kind, 2 example words, pilot flag, optional traditional alias, artwork `{file, brief, status, promptVersion?}`.
- **Source and its limit.** The list is the HSK Syllabus `H_DG_1110.pdf` (published 2025-11, effective 2026-07), section "HSK (Level 1) recognition characters", printed pages 353-354, entries 1-246
  ([PDF](https://download.chinesetest.cn/newhsk-site/Syllabus/H_DG_1110.pdf)). The characters were taken from the **owner-supplied transcription** (extracted by GPT with `pdftotext -layout` from the owner-uploaded PDF; diff report run 46067508854).
  **This repository's work did not download or independently verify the PDF.** The validator checks 246 unique, exact order, and that the dataset matches the transcription; it cannot prove the transcription matches the PDF.
- Diff vs the previous 200: 160 in both, **86 added**, **40 archived** (万山木风云地土石花草树河海头心耳眼脚身鱼鸟马羊走用长快红黑左右肉门店路站笔纸南北). 山木鱼鸟 (pilot images) are archive; 水火日月人雨 are active.
- The 86 new rows (Vietnamese gloss, pinyin, example words, art briefs) were written for this project and self-checked (pinyin/tone format, every example contains its character, no Hanzi in briefs, no abstract wording). **They are not native-reviewed**; some glosses are intentionally short (function words such as 吧, 得, 个).
  Pinyin shown is one common reading for polyphones (便 biàn, 还 hái, 觉 jué, 得 de, 只 zhǐ, 系 xì, 兴 xìng, 漂 piào); other readings appear in the examples (piányi, shìyí, xiāoxi …).
- Vietnamese text, examples and briefs are original; no third-party dictionary data was copied.
- Pilot 10 (山水木火日月人雨鱼鸟) keep the same asset filenames as `mnemonic.ts`; 魚/鳥 are traditional aliases of 鱼/鸟 and not counted separately.
- **Artwork:** every entry is `pending-artwork` in this file; the validator rejects approval flags until recorded with provenance. The owner reports 10 pilot candidate images in the generation artifact ledger (run 46063520659); this repo neither contains nor verified them.
  Briefs are modern memory aids, not historical evidence; no historical forms are claimed.
- Categories (all 286): number 17, nature 22, person 24, education 10, pronoun 6, function 42, body 10, animal 8, verb 52, adjective 25, direction 14, time 17, food 10, place 14, object 15 = 286. Active 246: number 16, nature 10, person 24, education 10, pronoun 6, function 42, body 4, animal 4, verb 50, adjective 21, direction 10, time 17, food 9, place 10, object 13.
- Image production: `--all` selects the **246 active only**; archive records are never generated in production. Retained images = 10 (6 active + 4 archive). New images needed = 246 - 6 = **240**
  (valid only if the carried manifest verifies; see `docs/MNEMONIC_ART_CLI.md`).
- Out of scope: M3.6 infrastructure, bulk image pipeline beyond the CLI, paid APIs without approval, historical-form claims.

## Known blocker (not addressed here)

CI WebKit `/login` axe `color-contrast` on `login-submit` persisted after the timing fix (CI #115). Per owner instruction no further timing fixes or test weakening were made; it needs a separate computed-contrast diagnosis of the button tokens.
