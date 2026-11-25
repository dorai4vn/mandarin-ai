/**
 * Dictionary search keys (PRD-02): find 山 via "山", "shān", "shan1", "shan" and "núi"/"nui".
 * Pure string functions, shared by the web app (local IndexedDB search) and tests.
 */

const MARKS = /[\u0300-\u036f]/g;

/** Pinyin → search key: lowercase, no tone marks/numbers, no spaces or apostrophes, ü → v. */
export function pinyinKey(raw: string): string {
  return raw
    .normalize('NFD')
    .toLowerCase()
    .replace(/u\u0308|ü|u:/g, 'v')
    .replace(MARKS, '')
    .replace(/[1-5]/g, '')
    .replace(/[\s'’·-]+/g, '');
}

/** Vietnamese → search key: lowercase, accents removed (đ → d), single spaces. */
export function vietnameseKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the text contains a CJK ideograph. */
export function hasHanzi(raw: string): boolean {
  return /\p{Script=Han}/u.test(raw);
}

const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/** One numbered syllable ("hao3", "lv4", "ma5") → marked ("hǎo", "lǜ", "ma"). */
function markSyllable(syllable: string): string {
  const m = /^([a-zü:v]+)([1-5])$/i.exec(syllable);
  if (!m) return syllable;
  const base = m[1]!.replace(/u:|v/gi, 'ü');
  const tone = Number(m[2]);
  if (tone === 5) return base;
  const lower = base.toLowerCase();
  // Standard placement: a or e first; "ou" → o; otherwise the last vowel.
  let idx = lower.search(/[ae]/);
  if (idx < 0) idx = lower.indexOf('ou');
  if (idx < 0) {
    for (let i = lower.length - 1; i >= 0; i--)
      if ('iouü'.includes(lower[i]!)) {
        idx = i;
        break;
      }
  }
  if (idx < 0) return base;
  const vowel = lower[idx]!;
  const marked = TONE_MARKS[vowel]![tone - 1]!;
  return base.slice(0, idx) + marked + base.slice(idx + 1);
}

/** "ni3 hao3" → "nǐ hǎo"; text that already has marks (or no numbers) is returned unchanged. */
export function numberedToMarked(raw: string): string {
  return raw
    .trim()
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : markSyllable(part)))
    .join('');
}

export interface SearchableEntry {
  simplified: string;
  traditional?: string | null;
  pinyin: string;
  meaningVi: string;
}

/** Search keys of one entry, computed once (D-032: no normalisation per keystroke per entry). */
export interface SearchKeys {
  forms: string[];
  pinyin: string;
  vi: string;
  viWords: string[];
  viParts: string[];
}

export function searchKeys(entry: SearchableEntry): SearchKeys {
  const vi = vietnameseKey(entry.meaningVi);
  return {
    forms: [entry.simplified, entry.traditional ?? ''].filter(Boolean),
    pinyin: pinyinKey(entry.pinyin),
    vi,
    viWords: vi.split(/[\s,;/()]+/).filter(Boolean),
    viParts: vi.split(/[,;/]/).map((p) => p.trim()),
  };
}

export interface PreparedQuery {
  raw: string;
  hanzi: boolean;
  pinyin: string;
  vi: string;
}

export function prepareQuery(query: string): PreparedQuery {
  const raw = query.trim();
  return { raw, hanzi: hasHanzi(raw), pinyin: pinyinKey(raw), vi: vietnameseKey(raw) };
}

/**
 * Relevance of pre-computed keys for a prepared query (0 = no match). Hanzi matches outrank
 * pinyin, pinyin outranks Vietnamese; exact > prefix > contained.
 */
export function scoreKeys(k: SearchKeys, q: PreparedQuery): number {
  if (!q.raw) return 0;
  if (q.hanzi) {
    if (k.forms.some((f) => f === q.raw)) return 100;
    if (k.forms.some((f) => f.startsWith(q.raw))) return 90;
    if (k.forms.some((f) => f.includes(q.raw))) return 80;
    return 0;
  }
  let score = 0;
  if (q.pinyin) {
    if (k.pinyin === q.pinyin) score = 70;
    else if (k.pinyin.startsWith(q.pinyin)) score = 60;
  }
  if (q.vi) {
    if (k.vi === q.vi) score = Math.max(score, 65);
    else if (k.viWords.includes(q.vi) || k.viParts.includes(q.vi)) score = Math.max(score, 55);
    else if (q.vi.length >= 2 && k.vi.includes(q.vi)) score = Math.max(score, 40);
  }
  return score;
}

/** Convenience for one entry (tests, small lists). */
export function matchScore(entry: SearchableEntry, query: string): number {
  return scoreKeys(searchKeys(entry), prepareQuery(query));
}
