import type { Lexeme } from '@mandarin/contracts';
import {
  prepareQuery,
  scoreKeys,
  searchKeys,
  type SearchKeys,
  type VocabularyItem,
} from '@mandarin/domain';

/** One row of the dictionary: a personal entry, a shared lexeme, or both (linked). */
export interface DictionaryEntry {
  key: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  meaningVi: string;
  mine: VocabularyItem | null;
  lexeme: Lexeme | null;
  score: number;
}

/** Search keys computed once per list (D-032 P2: nothing is normalised per keystroke per entry). */
export type Indexed<T> = { value: T; keys: SearchKeys }[];
export const indexLexemes = (lexemes: Map<string, Lexeme>): Indexed<Lexeme> =>
  [...lexemes.values()].map((value) => ({ value, keys: searchKeys(value) }));
export const indexVocabulary = (items: VocabularyItem[]): Indexed<VocabularyItem> =>
  items.map((value) => ({ value, keys: searchKeys(value) }));

const fromItem = (mine: VocabularyItem, lexeme: Lexeme | null, score = 0): DictionaryEntry => ({
  key: `v:${mine.id}`,
  simplified: mine.simplified,
  traditional: mine.traditional,
  pinyin: mine.pinyin,
  meaningVi: mine.meaningVi,
  mine,
  lexeme,
  score,
});

/**
 * Searches the account's words and the shared lexicon together (PRD-02). A lexeme already in the
 * personal list appears once, as the personal entry. Empty query → the personal list.
 */
export function searchDictionary(
  query: string,
  vocabulary: Indexed<VocabularyItem>,
  lexemes: Indexed<Lexeme>,
  byId: Map<string, Lexeme>,
  limit = 50,
): DictionaryEntry[] {
  const q = prepareQuery(query);
  const lexemeOf = (v: VocabularyItem) => (v.lexemeId ? (byId.get(v.lexemeId) ?? null) : null);
  if (!q.raw) return vocabulary.map(({ value }) => fromItem(value, lexemeOf(value)));
  const linked = new Set<string>();
  const out: DictionaryEntry[] = [];
  for (const { value, keys } of vocabulary) {
    if (value.lexemeId) linked.add(value.lexemeId);
    const score = scoreKeys(keys, q);
    // Personal entries rank slightly above shared ones with the same relevance.
    if (score > 0) out.push(fromItem(value, lexemeOf(value), score + 1));
  }
  for (const { value, keys } of lexemes) {
    if (linked.has(value.id)) continue;
    const score = scoreKeys(keys, q);
    if (score > 0)
      out.push({
        key: `l:${value.id}`,
        simplified: value.simplified,
        traditional: value.traditional,
        pinyin: value.pinyin,
        meaningVi: value.meaningVi,
        mine: null,
        lexeme: value,
        score,
      });
  }
  out.sort((a, b) => b.score - a.score || a.simplified.length - b.simplified.length);
  return out.slice(0, limit);
}
