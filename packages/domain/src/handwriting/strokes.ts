import type { InkStroke } from '@mandarin/contracts';

export type PointerKind = 'touch' | 'mouse' | 'pen' | 'unknown';

/**
 * Collects pointer samples (touch, mouse or pen) into vector strokes (x, y in canvas points,
 * t = ms since the first point). Pure TypeScript: no DOM, no React.
 */
export class StrokeRecorder {
  private strokes: InkStroke[] = [];
  private current: InkStroke | null = null;
  private origin: number | null = null;
  private kinds = new Set<PointerKind>();

  constructor(private readonly minDistance = 1.5) {}

  private rel(timestampMs: number): number {
    if (this.origin === null) this.origin = timestampMs;
    return Math.max(0, Math.round(timestampMs - this.origin));
  }

  begin(x: number, y: number, timestampMs: number, kind: PointerKind = 'unknown'): void {
    this.kinds.add(kind);
    this.current = { points: [{ x, y, t: this.rel(timestampMs) }] };
  }

  move(x: number, y: number, timestampMs: number): void {
    if (!this.current) return;
    const last = this.current.points[this.current.points.length - 1]!;
    // Drop near-duplicate samples to keep payloads small without losing shape.
    if (Math.hypot(x - last.x, y - last.y) < this.minDistance) return;
    this.current.points.push({ x, y, t: Math.max(last.t, this.rel(timestampMs)) });
  }

  end(): void {
    if (this.current) this.strokes.push(this.current);
    this.current = null;
  }

  clear(): void {
    this.strokes = [];
    this.current = null;
    this.origin = null;
    this.kinds.clear();
  }

  /** Dominant input type of the drawing ('unknown' when mixed or not reported). */
  pointerKind(): PointerKind {
    return this.kinds.size === 1 ? [...this.kinds][0]! : 'unknown';
  }

  isEmpty(): boolean {
    return this.strokes.length === 0 && !this.current;
  }

  /** Completed strokes plus the in-progress one (for live rendering). */
  snapshot(): InkStroke[] {
    return this.current ? [...this.strokes, this.current] : [...this.strokes];
  }

  completed(): InkStroke[] {
    return [...this.strokes];
  }
}

/** SVG path for rendering a stroke. */
export function strokeToSvgPath(stroke: InkStroke): string {
  return stroke.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}
