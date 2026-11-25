import type { Lexeme } from '@mandarin/contracts';
import { matchScore, type VocabularyItem } from '@mandarin/domain';

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
  vocabulary: VocabularyItem[],
  lexemes: Map<string, Lexeme>,
  limit = 100,
): DictionaryEntry[] {
  const q = query.trim();
  if (!q)
    return vocabulary.map((v) =>
      fromItem(v, v.lexemeId ? (lexemes.get(v.lexemeId) ?? null) : null),
    );
  const linked = new Set(vocabulary.map((v) => v.lexemeId).filter(Boolean));
  const out: DictionaryEntry[] = [];
  for (const v of vocabulary) {
    const score = matchScore(v, q);
    // Personal entries rank slightly above shared ones with the same relevance.
    if (score > 0)
      out.push(fromItem(v, v.lexemeId ? (lexemes.get(v.lexemeId) ?? null) : null, score + 1));
  }
  for (const l of lexemes.values()) {
    if (linked.has(l.id)) continue;
    const score = matchScore(l, q);
    if (score > 0)
      out.push({
        key: `l:${l.id}`,
        simplified: l.simplified,
        traditional: l.traditional,
        pinyin: l.pinyin,
        meaningVi: l.meaningVi,
        mine: null,
        lexeme: l,
        score,
      });
  }
  return out
    .sort((a, b) => b.score - a.score || a.simplified.length - b.simplified.length)
    .slice(0, limit);
}
