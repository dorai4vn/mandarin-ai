# Beginner-200 content dataset (M3.5)

Owner decision 2026-11-27: M3.5 is capped at **200 unique simplified characters** (not words), personal-use-first.

- Data: `apps/web/src/hanzi/beginner200.json`; types + validator: `apps/web/src/hanzi/beginner200.ts`; tests: `beginner200.test.ts`.
- Each row: id, hanzi, pinyin, Vietnamese meaning, category, mnemonic kind (concrete / contextual), 2 example words, pilot flag, optional traditional alias, artwork `{file, brief, status}`.
- **Selection is original and provisional.** It is not the official HSK 3.0 list. No HSK level is stored per character; exact membership must be verified individually against the official syllabus
  ([H_DG_1110.pdf](https://download.chinesetest.cn/newhsk-site/Syllabus/H_DG_1110.pdf), [chinesetest.cn/HSK](https://www.chinesetest.cn/HSK)). Topic progression reference: <https://www.mandarin.ac.cn/textbook/>. The "246 recognition characters at level 1" figure comes from a secondary mirror and is unverified.
- Vietnamese text, examples and briefs are original; no third-party dictionary data was copied. Example words are common vocabulary and should get a native-speaker review before release.
- Pilot 10 (山水木火日月人雨鱼鸟) keep the same asset filenames as `mnemonic.ts`; 魚/鳥 are traditional aliases of 鱼/鸟 and not counted separately (the test enforces this).
- **Artwork: 0/200 exist.** Every entry is `pending-artwork`; the validator rejects any approval until real images with provenance exist. Briefs are modern memory aids, not historical evidence; no historical forms are claimed.
- Categories (exact counts): number 14, nature 21, person 19, pronoun 4, function 23, body 8, animal 8, verb 32, adjective 15, direction 13, time 11, food 9, place 9, object 9, education 5 = 200.
- Out of scope: M3.6 infrastructure, bulk image pipeline, paid APIs.

## Known blocker (not addressed here)

CI WebKit `/login` axe `color-contrast` on `login-submit` persisted after the timing fix (CI #115). Per owner instruction no further timing fixes or test weakening were made; it needs a separate computed-contrast diagnosis of the button tokens.
