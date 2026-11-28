import type { VisualKind } from './artworkRemediation';

/**
 * Zero-cost, deterministic editorial concept graphics (no AI image, no paid call). Fictional/stylised:
 * banknotes are NOT replicas of any real currency. Text/numerals are intentional teaching labels.
 * Colours use currentColor / theme CSS variables so the global theme applies.
 */
export const VISUAL_LABEL: Record<VisualKind, string> = {
  'banknote-100': 'Tờ tiền hư cấu mệnh giá 100 (一百)',
  'banknote-1000': 'Mười tờ tiền hư cấu mệnh giá 100 = 1000 (一千)',
  'scoreboard-0': 'Bảng tỉ số 0 : 0 (零)',
  'calendar-today': 'Lịch đối chiếu: hôm qua → HÔM NAY (今天) được đánh dấu',
  'calendar-yesterday': 'Lịch đối chiếu: HÔM QUA (昨天) được đánh dấu → hôm nay',
  'rental-sign': 'Biển cho thuê nhà 出租 đối chiếu với biển bán nhà 出售',
};

const FONT = 'system-ui, "Noto Sans SC", sans-serif';

function Note({
  x,
  y,
  w = 150,
  h = 70,
  value,
  tilt = 0,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  value: number;
  tilt?: number;
}) {
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`} data-banknote={value}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="var(--surface-raised)"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <rect
        x={x + 6}
        y={y + 6}
        width={w - 12}
        height={h - 12}
        rx={3}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.8}
        strokeDasharray="3 3"
        opacity={0.6}
      />
      <circle
        cx={x + w / 2}
        cy={y + h / 2}
        r={h / 3.2}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.5}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 9}
        textAnchor="middle"
        fontSize={26}
        fontWeight={700}
        fill="currentColor"
        fontFamily={FONT}
      >
        {value}
      </text>
      <text x={x + 12} y={y + 20} fontSize={11} fill="currentColor" fontFamily={FONT} opacity={0.8}>
        {value}
      </text>
      <text
        x={x + w - 12}
        y={y + h - 10}
        textAnchor="end"
        fontSize={11}
        fill="currentColor"
        fontFamily={FONT}
        opacity={0.8}
      >
        {value}
      </text>
    </g>
  );
}

function Day({ x, label, zh, active }: { x: number; label: string; zh: string; active: boolean }) {
  return (
    <g data-day={zh} data-active={active ? 'true' : 'false'}>
      <rect
        x={x}
        y={14}
        width={104}
        height={104}
        rx={8}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.16 : 0}
        stroke="currentColor"
        strokeWidth={active ? 3 : 1.2}
      />
      <rect
        x={x}
        y={14}
        width={104}
        height={24}
        rx={8}
        fill="currentColor"
        opacity={active ? 0.9 : 0.35}
      />
      <text
        x={x + 52}
        y={31}
        textAnchor="middle"
        fontSize={12}
        fill="var(--bg-page)"
        fontFamily={FONT}
      >
        {label}
      </text>
      <text
        x={x + 52}
        y={84}
        textAnchor="middle"
        fontSize={30}
        fontWeight={700}
        fill="currentColor"
        fontFamily={FONT}
      >
        {zh}
      </text>
      {active && (
        <text
          x={x + 52}
          y={108}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          fontFamily={FONT}
        >
          ★ đang học
        </text>
      )}
    </g>
  );
}

export function VisualConcept({ kind, hanzi }: { kind: VisualKind; hanzi: string }) {
  const label = `${hanzi} — ${VISUAL_LABEL[kind]}`;
  let body: React.ReactNode;
  let box = '0 0 240 132';
  if (kind === 'banknote-100') {
    box = '0 0 220 120';
    body = <Note x={30} y={25} w={160} h={74} value={100} />;
  } else if (kind === 'banknote-1000') {
    box = '0 0 260 150';
    body = (
      <>
        {Array.from({ length: 10 }, (_, i) => (
          <Note key={i} x={14 + i * 7} y={14 + i * 8} w={150} h={64} value={100} />
        ))}
        <text
          x={240}
          y={130}
          textAnchor="end"
          fontSize={20}
          fontWeight={700}
          fill="currentColor"
          fontFamily={FONT}
        >
          10 × 100 = 1000
        </text>
      </>
    );
  } else if (kind === 'scoreboard-0') {
    box = '0 0 240 120';
    body = (
      <>
        <rect x={14} y={14} width={212} height={92} rx={10} fill="currentColor" fillOpacity={0.9} />
        <text
          x={64}
          y={78}
          textAnchor="middle"
          fontSize={52}
          fontWeight={800}
          fill="var(--bg-page)"
          fontFamily="ui-monospace, monospace"
        >
          0
        </text>
        <text
          x={120}
          y={74}
          textAnchor="middle"
          fontSize={34}
          fill="var(--bg-page)"
          fontFamily={FONT}
        >
          :
        </text>
        <text
          x={176}
          y={78}
          textAnchor="middle"
          fontSize={52}
          fontWeight={800}
          fill="var(--bg-page)"
          fontFamily="ui-monospace, monospace"
        >
          0
        </text>
      </>
    );
  } else if (kind === 'calendar-today' || kind === 'calendar-yesterday') {
    const today = kind === 'calendar-today';
    box = '0 0 260 132';
    body = (
      <>
        <Day x={10} label="Hôm qua" zh="昨天" active={!today} />
        <text
          x={130}
          y={72}
          textAnchor="middle"
          fontSize={22}
          fill="currentColor"
          fontFamily={FONT}
        >
          →
        </text>
        <Day x={146} label="Hôm nay" zh="今天" active={today} />
      </>
    );
  } else {
    box = '0 0 260 140';
    body = (
      <>
        <rect x={20} y={10} width={6} height={110} fill="currentColor" opacity={0.6} />
        <g data-sign="出租">
          <rect
            x={26}
            y={18}
            width={110}
            height={52}
            rx={6}
            fill="currentColor"
            fillOpacity={0.9}
          />
          <text
            x={81}
            y={53}
            textAnchor="middle"
            fontSize={30}
            fontWeight={800}
            fill="var(--bg-page)"
            fontFamily={FONT}
          >
            出租
          </text>
        </g>
        <text x={81} y={86} textAnchor="middle" fontSize={11} fill="currentColor" fontFamily={FONT}>
          cho thuê (租)
        </text>
        <g data-sign="出售" opacity={0.65}>
          <rect
            x={150}
            y={18}
            width={100}
            height={52}
            rx={6}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <text
            x={200}
            y={53}
            textAnchor="middle"
            fontSize={26}
            fontWeight={700}
            fill="currentColor"
            fontFamily={FONT}
          >
            出售
          </text>
        </g>
        <text
          x={200}
          y={86}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          fontFamily={FONT}
        >
          bán (không phải 租)
        </text>
        <path
          d="M60 130 L81 108 L102 130 Z M66 130 H96 V118 H66 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </>
    );
  }
  return (
    <svg
      viewBox={box}
      role="img"
      aria-label={label}
      className="mx-auto block h-auto w-full max-w-[16rem] text-accent-text"
      data-testid="artwork-qc-visual"
      data-visual={kind}
    >
      <title>{label}</title>
      {body}
    </svg>
  );
}
