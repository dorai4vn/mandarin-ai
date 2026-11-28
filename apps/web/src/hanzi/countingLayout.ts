/**
 * Deterministic counting-diagram layout (no AI image, no randomness). Pure data -> dot coordinates so
 * that tests can assert the exact number of dots a learner sees.
 */
export interface DiagramSpec {
  /** Total dots the diagram must show (0 = empty set). */
  count: number;
  /** Row sizes for small numbers, e.g. [3,3] for 六. Sum must equal count. */
  groups?: number[];
  /** Number of 10x10 blocks (百 = 1, 千 = 10). Each block is 10 rows of 10 dots. */
  blocks?: number;
}

export interface Dot {
  x: number;
  y: number;
}
export interface DiagramLayout {
  width: number;
  height: number;
  r: number;
  dots: Dot[];
  /** Block frames (for 百/千) or the empty-set outline (零). */
  frames: { x: number; y: number; w: number; h: number }[];
  empty: boolean;
}

const BLOCK_STEP = 10; // dot pitch inside a 10x10 block
const BLOCK_SIZE = 9 * BLOCK_STEP + 10; // 100
const BLOCK_GAP = 14;

export function diagramLayout(spec: DiagramSpec): DiagramLayout {
  if (spec.count === 0) {
    return {
      width: 160,
      height: 100,
      r: 0,
      dots: [],
      frames: [{ x: 10, y: 10, w: 140, h: 80 }],
      empty: true,
    };
  }
  if (spec.blocks) {
    const cols = spec.blocks > 1 ? Math.ceil(spec.blocks / 2) : 1;
    const rows = Math.ceil(spec.blocks / cols);
    const dots: Dot[] = [];
    const frames: DiagramLayout['frames'] = [];
    for (let b = 0; b < spec.blocks; b++) {
      const ox = BLOCK_GAP + (b % cols) * (BLOCK_SIZE + BLOCK_GAP);
      const oy = BLOCK_GAP + Math.floor(b / cols) * (BLOCK_SIZE + BLOCK_GAP);
      frames.push({ x: ox, y: oy, w: BLOCK_SIZE, h: BLOCK_SIZE });
      for (let i = 0; i < 100; i++) {
        dots.push({
          x: ox + 5 + (i % 10) * BLOCK_STEP,
          y: oy + 5 + Math.floor(i / 10) * BLOCK_STEP,
        });
      }
    }
    return {
      width: BLOCK_GAP + cols * (BLOCK_SIZE + BLOCK_GAP),
      height: BLOCK_GAP + rows * (BLOCK_SIZE + BLOCK_GAP),
      r: 3.4,
      dots,
      frames,
      empty: false,
    };
  }
  const groups = spec.groups ?? [spec.count];
  const widest = Math.max(...groups);
  const pitch = 36;
  const dots: Dot[] = [];
  groups.forEach((n, row) => {
    const offset = ((widest - n) * pitch) / 2;
    for (let i = 0; i < n; i++) dots.push({ x: 24 + offset + i * pitch, y: 24 + row * pitch });
  });
  return {
    width: 24 * 2 + (widest - 1) * pitch,
    height: 24 * 2 + (groups.length - 1) * pitch,
    r: 13,
    dots,
    frames: [],
    empty: false,
  };
}

export function describeDiagram(spec: DiagramSpec): string {
  if (spec.count === 0) return 'Sơ đồ đếm: tập rỗng, 0 chấm.';
  if (spec.blocks) {
    return spec.blocks === 1
      ? 'Sơ đồ đếm: 1 khối gồm 10 hàng × 10 chấm = 100 chấm.'
      : `Sơ đồ đếm: ${spec.blocks} khối, mỗi khối 10 hàng × 10 chấm (100 chấm) = ${spec.count} chấm.`;
  }
  const g = spec.groups ?? [spec.count];
  return `Sơ đồ đếm: ${spec.count} chấm, ${g.length} hàng (${g.join(' + ')}).`;
}
