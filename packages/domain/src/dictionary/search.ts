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

/**
 * Relevance of an entry for a query (0 = no match). Hanzi matches outrank pinyin, pinyin outranks
 * Vietnamese; exact > prefix > contained.
 */
export function matchScore(entry: SearchableEntry, query: string): number {
  const q = query.trim();
  if (!q) return 0;
  if (hasHanzi(q)) {
    const forms = [entry.simplified, entry.traditional ?? ''].filter(Boolean);
    if (forms.some((f) => f === q)) return 100;
    if (forms.some((f) => f.startsWith(q))) return 90;
    if (forms.some((f) => f.includes(q))) return 80;
    return 0;
  }
  let score = 0;
  const pq = pinyinKey(q);
  const pk = pinyinKey(entry.pinyin);
  if (pq) {
    if (pk === pq) score = 70;
    else if (pk.startsWith(pq)) score = 60;
  }
  const vq = vietnameseKey(q);
  if (vq) {
    const vk = vietnameseKey(entry.meaningVi);
    const words = vk.split(/[\s,;/()]+/).filter(Boolean);
    if (vk === vq) score = Math.max(score, 65);
    else if (words.includes(vq) || vk.split(/[,;/]/).some((p) => p.trim() === vq))
      score = Math.max(score, 55);
    else if (vq.length >= 2 && vk.includes(vq)) score = Math.max(score, 40);
  }
  return score;
}
