/**
 * Lightweight index (kept out of the lazy chunk) of characters that have sourced history.
 * Must stay in sync with data.ts (enforced by model.test.ts).
 */
export const HISTORY_GLYPHS: readonly string[] = ['山'];

export function hasHanziHistory(glyph: string): boolean {
  return HISTORY_GLYPHS.includes(glyph);
}

/** Distinct characters of a word that have history, in order. */
export function historyGlyphsOf(word: string): string[] {
  return [...new Set([...word])].filter(hasHanziHistory);
}
