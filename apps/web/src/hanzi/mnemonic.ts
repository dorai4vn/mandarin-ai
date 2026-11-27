/**
 * Visual Mnemonic manifest (D3). A mnemonic is a MODERN memory aid, never historical evidence.
 * Artwork is pending: no image file exists yet, so every entry has `image: null` and the card
 * falls back to text. Cues are original Vietnamese text written for this project.
 */
export interface MnemonicImage {
  /** Path under /public, e.g. /mnemonic/shan.webp (4:3). */
  src: string;
  alt: string;
  width: 1600;
  height: 1200;
  provenance: string;
  licence: string;
  licenceUrl: string;
  author: string;
}

export interface MnemonicEntry {
  glyph: string;
  /** Other forms that share this entry (simplified/traditional variants). */
  aliases: string[];
  cueVi: string;
  /** Planned asset filename (pending generation by owner/GPT). */
  assetFile: string;
  /** Detailed original art brief (Premium Editorial Illustration). */
  brief: string;
  image: MnemonicImage | null;
  status: 'pending-artwork' | 'artwork-approved';
  isHistoricalEvidence: false;
}

const STYLE =
  'Premium editorial digital painting / gouache, 4:3, detailed natural textures, depth, soft directional lighting, coherent muted palette; no text or characters inside the artwork (typography is rendered separately).';

const E = (
  glyph: string,
  aliases: string[],
  cueVi: string,
  assetFile: string,
  scene: string,
): MnemonicEntry => ({
  glyph,
  aliases,
  cueVi,
  assetFile,
  brief: `${scene} ${STYLE}`,
  image: null,
  status: 'pending-artwork',
  isHistoricalEvidence: false,
});

export const MNEMONICS: readonly MnemonicEntry[] = [
  E('山', [], 'Ba đỉnh núi, đỉnh giữa cao nhất.', 'shan-mountain.webp',
    'Three layered mountain peaks in morning mist, the centre peak tallest, ridges receding in atmospheric perspective, pine foliage and rock strata in the foreground.'),
  E('水', [], 'Dòng nước chảy giữa với các tia nước bắn hai bên.', 'shui-water.webp',
    'A mountain stream flowing down the centre with splashes arcing left and right, wet stones, light refracting through water, mossy banks.'),
  E('木', [], 'Thân cây ở giữa, cành ở trên, rễ ở dưới.', 'mu-tree.webp',
    'A single old tree seen whole: a straight trunk, branches spreading above, exposed roots below, bark texture and dappled light.'),
  E('火', [], 'Ngọn lửa ở giữa với tia lửa bắn ra hai bên.', 'huo-fire.webp',
    'A campfire with a tall central flame and sparks flying left and right, glowing embers, warm light falling on nearby stones in the dark.'),
  E('日', [], 'Mặt trời tròn, vạch ngang là đường chân trời.', 'ri-sun.webp',
    'A low sun over a calm horizon, bold disc with a horizontal band of cloud across it, warm gradient sky, reflections on still water.'),
  E('月', [], 'Trăng khuyết với vài vệt mây ngang.', 'yue-moon.webp',
    'A crescent moon in a night sky with two thin horizontal cloud streaks, cool silver light over a quiet landscape, fine stars.'),
  E('人', [], 'Một người đứng bằng hai chân.', 'ren-person.webp',
    'A lone figure seen from the side or behind, walking on two legs along a path, long shadow, strong silhouette in editorial composition.'),
  E('雨', [], 'Mái trời phía trên, giọt mưa rơi xuống.', 'yu-rain.webp',
    'A heavy cloud canopy above with drops falling inside a window-like frame of light, wet glass, glistening street, soft reflections.'),
  E('魚', ['鱼'], 'Đầu cá, thân cá và đuôi cá bơi ở dưới.', 'yu-fish.webp',
    'A carp swimming in clear water: head, scaled body, and tail clearly visible, caustic light on the riverbed, detailed scales.'),
  E('鳥', ['鸟'], 'Đầu chim có mỏ, thân và chân đậu trên cành.', 'niao-bird.webp',
    'A small bird perched on a branch showing head with beak, body, and legs, detailed feathers, soft backlight, blurred foliage.'),
];

/** Only local, approved mnemonic assets are allowed: no protocol-relative, absolute-URL or traversal paths. */
const APPROVED_SRC = /^\/mnemonic\/[a-z0-9-]+\.webp$/;
export const isSafeMnemonicSrc = (src: string): boolean => APPROVED_SRC.test(src);

/** Owner-review preview path: candidate images live apart from approved assets and are never evidence. */
export const candidateSrc = (m: MnemonicEntry): string => `/mnemonic-candidates/${m.assetFile}`;

export function mnemonicSummary(list: readonly MnemonicEntry[] = MNEMONICS) {
  const approved = list.filter((m) => m.status === 'artwork-approved').length;
  return { total: list.length, approved, pending: list.length - approved };
}

export function findMnemonic(glyph: string): MnemonicEntry | undefined {
  return MNEMONICS.find((m) => m.glyph === glyph || m.aliases.includes(glyph));
}

/** Returns problems; an entry may only claim an image with full provenance + licence. */
export function validateMnemonics(list: readonly MnemonicEntry[] = MNEMONICS): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const m of list) {
    for (const k of [m.glyph, ...m.aliases]) {
      if (seen.has(k)) errs.push(`duplicate ${k}`);
      seen.add(k);
    }
    if (!m.cueVi.trim()) errs.push(`${m.glyph}: cue`);
    if (!/^[a-z-]+\.webp$/.test(m.assetFile)) errs.push(`${m.glyph}: assetFile`);
    if (m.isHistoricalEvidence !== false) errs.push(`${m.glyph}: evidence flag`);
    if (m.image) {
      const i = m.image;
      if (!isSafeMnemonicSrc(i.src) || !i.alt || !i.provenance || !i.licence || !i.author)
        errs.push(`${m.glyph}: image provenance`);
      if (!i.licenceUrl.startsWith('https://')) errs.push(`${m.glyph}: licenceUrl`);
      if (m.status !== 'artwork-approved') errs.push(`${m.glyph}: image without approval`);
    } else if (m.status === 'artwork-approved') errs.push(`${m.glyph}: approved without image`);
  }
  return errs;
}
