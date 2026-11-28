import { describeDiagram, diagramLayout, type DiagramSpec } from './countingLayout';

/** Accessible, deterministic SVG counting diagram. Theme-aware via currentColor / CSS variables. */
export function CountingDiagram({ spec, hanzi }: { spec: DiagramSpec; hanzi: string }) {
  const L = diagramLayout(spec);
  const label = `${hanzi} — ${describeDiagram(spec)}`;
  return (
    <svg
      viewBox={`0 0 ${L.width} ${L.height}`}
      role="img"
      aria-label={label}
      className="mx-auto block h-auto w-full max-w-[16rem] text-accent-text"
      data-testid="artwork-qc-diagram"
      data-dot-count={L.dots.length}
    >
      <title>{label}</title>
      {L.frames.map((f, i) => (
        <rect
          key={i}
          x={f.x}
          y={f.y}
          width={f.w}
          height={f.h}
          rx={6}
          fill="none"
          stroke="currentColor"
          strokeWidth={L.empty ? 2 : 1}
          strokeDasharray={L.empty ? '6 5' : undefined}
          opacity={0.6}
        />
      ))}
      {L.dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={L.r} fill="currentColor" data-dot="" />
      ))}
    </svg>
  );
}
