/**
 * M3.5 Hanzi dataset (owner scope migration 2026-11-27): 246 ACTIVE characters = HSK 3.0 Level 1 recognition list
 * (set 'syllabus-l1', exact source order in `sourceOrder`) + 40 ARCHIVE records (set 'extension') kept from the earlier
 * original selection (no level claimed). File name is historical (beginner200.json); record ids are stable.
 * Briefs are modern memory aids and never historical evidence.
 */
import raw from './beginner200.json';
import { MNEMONICS } from './mnemonic';
import { SYLLABUS_L1, SYLLABUS_L1_COUNT, EXTENSION_COUNT } from './syllabusL1';

export type BeginnerCategory =
  | 'number'
  | 'nature'
  | 'person'
  | 'pronoun'
  | 'function'
  | 'body'
  | 'animal'
  | 'verb'
  | 'adjective'
  | 'direction'
  | 'time'
  | 'food'
  | 'place'
  | 'object'
  | 'education';

export const BEGINNER_CATEGORIES: readonly BeginnerCategory[] = [
  'number',
  'nature',
  'person',
  'pronoun',
  'function',
  'body',
  'animal',
  'verb',
  'adjective',
  'direction',
  'time',
  'food',
  'place',
  'object',
  'education',
];

export interface BeginnerExample {
  zh: string;
  pinyin: string;
  vi: string;
}

export interface BeginnerChar {
  id: number;
  hanzi: string;
  pinyin: string;
  meaningVi: string;
  category: BeginnerCategory;
  mnemonicKind: 'concrete' | 'contextual';
  examples: BeginnerExample[];
  pilot: boolean;
  /** 'syllabus-l1' = active (in the official Level 1 recognition list); 'extension' = archive, not in that list. */
  set: 'syllabus-l1' | 'extension';
  /** 1..246 position in the source list; only for set 'syllabus-l1'. */
  sourceOrder?: number;
  traditionalAlias?: string;
  artwork: { file: string; brief: string; status: 'pending-artwork' | 'artwork-approved' };
}

export interface BeginnerDataset {
  meta: { version: number; selectionNote: string; officialReferences: string[] } & Record<
    string,
    unknown
  >;
  characters: BeginnerChar[];
}

export const BEGINNER_TARGET = SYLLABUS_L1_COUNT + EXTENSION_COUNT;
export const BEGINNER: BeginnerDataset = raw as unknown as BeginnerDataset;

const HAN = /^\p{Script=Han}$/u;
const PINYIN = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿɡɑŉəɛŋ' ]+$/u;

export const activeChars = (d: BeginnerDataset = BEGINNER) =>
  d.characters.filter((c) => c.set === 'syllabus-l1');
export const archiveChars = (d: BeginnerDataset = BEGINNER) =>
  d.characters.filter((c) => c.set === 'extension');

export function beginnerSummary(d: BeginnerDataset = BEGINNER) {
  const byCategory: Record<string, number> = {};
  for (const c of d.characters) byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
  const approved = d.characters.filter((c) => c.artwork.status === 'artwork-approved').length;
  return {
    total: d.characters.length,
    active: activeChars(d).length,
    archive: archiveChars(d).length,
    target: BEGINNER_TARGET,
    pilot: d.characters.filter((c) => c.pilot).length,
    artworkApproved: approved,
    artworkPending: d.characters.length - approved,
    byCategory,
  };
}

/** Returns problems (empty = valid). Never relaxes: any problem fails the dataset test. */
export function validateBeginner(d: BeginnerDataset = BEGINNER): string[] {
  const errs: string[] = [];
  const hanzi = new Set<string>();
  const files = new Set<string>();
  const ids = new Set<number>();
  if (d.characters.length !== BEGINNER_TARGET)
    errs.push(`count ${d.characters.length} != ${BEGINNER_TARGET}`);
  if (/\bHSK\s*[1-9]\b/i.test(JSON.stringify(d.characters)))
    errs.push('per-character HSK level claim (membership is the set field only)');
  const active = activeChars(d);
  if (active.length !== SYLLABUS_L1_COUNT)
    errs.push(`active ${active.length} != ${SYLLABUS_L1_COUNT}`);
  if (archiveChars(d).length !== EXTENSION_COUNT)
    errs.push(`archive ${archiveChars(d).length} != ${EXTENSION_COUNT}`);
  const bySource = [...active].sort((a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));
  if (bySource.map((c) => c.hanzi).join('') !== SYLLABUS_L1)
    errs.push('active set/order differs from the Level 1 source list');
  bySource.forEach((c, i) => {
    if (c.sourceOrder !== i + 1) errs.push(`${c.hanzi}: sourceOrder`);
  });
  d.characters.forEach((c, i) => {
    const k = `${c.hanzi}(#${c.id})`;
    if (c.id !== i + 1 || ids.has(c.id)) errs.push(`${k}: id`);
    if (c.set !== 'syllabus-l1' && c.set !== 'extension') errs.push(`${k}: set`);
    if (c.set === 'extension' && c.sourceOrder !== undefined)
      errs.push(`${k}: archive record must not carry a source order`);
    if (SYLLABUS_L1.includes(c.hanzi) !== (c.set === 'syllabus-l1'))
      errs.push(`${k}: set disagrees with the Level 1 list`);
    ids.add(c.id);
    if (!HAN.test(c.hanzi)) errs.push(`${k}: hanzi must be exactly one Han character`);
    if (hanzi.has(c.hanzi)) errs.push(`${k}: duplicate hanzi`);
    hanzi.add(c.hanzi);
    if (!PINYIN.test(c.pinyin)) errs.push(`${k}: pinyin`);
    if (!c.meaningVi.trim()) errs.push(`${k}: meaningVi`);
    if (!BEGINNER_CATEGORIES.includes(c.category)) errs.push(`${k}: category`);
    if (c.mnemonicKind !== 'concrete' && c.mnemonicKind !== 'contextual') errs.push(`${k}: kind`);
    if (c.examples.length < 2) errs.push(`${k}: needs >=2 examples`);
    for (const e of c.examples) {
      if (!e.zh.includes(c.hanzi)) errs.push(`${k}: example ${e.zh} lacks character`);
      if (!PINYIN.test(e.pinyin) || !e.vi.trim()) errs.push(`${k}: example ${e.zh} fields`);
    }
    if (!/^[a-z]+(-[a-z]+)+\.webp$/.test(c.artwork.file)) errs.push(`${k}: art file`);
    if (files.has(c.artwork.file)) errs.push(`${k}: duplicate art file`);
    files.add(c.artwork.file);
    if (c.artwork.brief.trim().length < 40) errs.push(`${k}: brief too short`);
    if (c.artwork.status !== 'pending-artwork')
      errs.push(`${k}: artwork must stay pending (no image exists)`);
    if (c.traditionalAlias !== undefined && (!c.pilot || !HAN.test(c.traditionalAlias)))
      errs.push(`${k}: alias`);
  });
  return errs;
}

/** Pilot 10 must stay consistent with the mnemonic manifest (simplified 鱼/鸟 = aliases of 魚/鳥). */
export function pilotConsistency(d: BeginnerDataset = BEGINNER): string[] {
  const errs: string[] = [];
  for (const m of MNEMONICS) {
    const hit = d.characters.find((c) => c.hanzi === m.glyph || m.aliases.includes(c.hanzi));
    if (!hit) errs.push(`${m.glyph}: missing`);
    else {
      if (!hit.pilot) errs.push(`${m.glyph}: not flagged pilot`);
      if (hit.artwork.file !== m.assetFile) errs.push(`${m.glyph}: asset file mismatch`);
      if (hit.traditionalAlias !== undefined && hit.traditionalAlias !== m.glyph)
        errs.push(`${m.glyph}: alias mismatch`);
    }
  }
  return errs;
}
