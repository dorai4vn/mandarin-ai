import type { InkStroke } from '@mandarin/contracts';

/**
 * Collects touch samples into vector strokes for Digital Ink (x, y in canvas points,
 * t = ms since the first touch). Pure TypeScript so it is unit-testable without RN.
 */
export class StrokeRecorder {
  private strokes: InkStroke[] = [];
  private current: InkStroke | null = null;
  private origin: number | null = null;

  constructor(private readonly minDistance = 1.5) {}

  private rel(timestampMs: number): number {
    if (this.origin === null) this.origin = timestampMs;
    return Math.max(0, Math.round(timestampMs - this.origin));
  }

  begin(x: number, y: number, timestampMs: number): void {
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
