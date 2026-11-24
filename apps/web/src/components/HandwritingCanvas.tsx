'use client';
import { StrokeRecorder, type PointerKind } from '@mandarin/domain';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface HandwritingCanvasHandle {
  clear: () => void;
  undo: () => void;
  recorder: () => StrokeRecorder;
  size: () => { width: number; height: number };
}

const toKind = (t: string): PointerKind =>
  t === 'touch' || t === 'mouse' || t === 'pen' ? t : 'unknown';

/**
 * Pointer Events canvas for touch, mouse and pen (D-028: never touch-only). `touch-action: none`
 * stops scroll/zoom while writing; pointer capture keeps strokes going outside the box;
 * coalesced events give smoother pen input where supported.
 */
export const HandwritingCanvas = forwardRef<
  HandwritingCanvasHandle,
  { onChange?: (strokes: number) => void; label: string }
>(function HandwritingCanvas({ onChange, label }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recorder] = useState(() => new StrokeRecorder(1));
  const activePointer = useRef<number | null>(null);
  const [lastKind, setLastKind] = useState<PointerKind>('unknown');

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Practice grid (米字格).
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    // Grid colour from the V2 token (stroke.guide); fallback keeps old browsers working.
    ctx.strokeStyle =
      getComputedStyle(canvas).getPropertyValue('--stroke-guide').trim() || '#c9d2e3';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(0, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = getComputedStyle(canvas).color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, Math.min(w, h) / 40);
    for (const s of recorder.snapshot()) {
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (s.points.length === 1) ctx.lineTo(s.points[0]!.x + 0.1, s.points[0]!.y + 0.1);
      ctx.stroke();
    }
  }, [recorder]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    draw();
  }, [draw]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [resize]);

  const point = (e: PointerEvent | React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp };
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      recorder.clear();
      draw();
      onChange?.(0);
    },
    undo: () => {
      const strokes = recorder.completed().slice(0, -1);
      recorder.clear();
      // Re-record remaining strokes preserving their relative timing.
      strokes.forEach((s) => {
        const [first, ...rest] = s.points;
        if (!first) return;
        recorder.begin(first.x, first.y, first.t, lastKind);
        rest.forEach((p) => recorder.move(p.x, p.y, p.t));
        recorder.end();
      });
      draw();
      onChange?.(recorder.completed().length);
    },
    recorder: () => recorder,
    size: () => {
      const r = canvasRef.current?.getBoundingClientRect();
      return { width: r?.width ?? 1, height: r?.height ?? 1 };
    },
  }));

  return (
    <div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        data-testid="handwriting-canvas"
        data-pointer-kind={lastKind}
        className="aspect-square w-full max-w-[min(100%,32rem)] touch-none select-none rounded-2xl border-2 border-line bg-sunken text-fg [touch-action:none]"
        onPointerDown={(e) => {
          if (activePointer.current !== null || (e.pointerType === 'mouse' && e.button !== 0))
            return;
          activePointer.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* capture unavailable (e.g. synthetic pointer); drawing still works inside the box */
          }
          const p = point(e);
          const kind = toKind(e.pointerType);
          setLastKind(kind);
          recorder.begin(p.x, p.y, p.t, kind);
          draw();
        }}
        onPointerMove={(e) => {
          if (activePointer.current !== e.pointerId) return;
          const events =
            typeof e.nativeEvent.getCoalescedEvents === 'function'
              ? e.nativeEvent.getCoalescedEvents()
              : [];
          for (const ev of events.length ? events : [e.nativeEvent]) {
            const p = point(ev);
            recorder.move(p.x, p.y, p.t);
          }
          draw();
        }}
        onPointerUp={(e) => {
          if (activePointer.current !== e.pointerId) return;
          activePointer.current = null;
          recorder.end();
          draw();
          onChange?.(recorder.completed().length);
        }}
        onPointerCancel={() => {
          activePointer.current = null;
          recorder.end();
          draw();
          onChange?.(recorder.completed().length);
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      <p className="mt-1 text-xs text-ink-2">
        Thiết bị nhập vừa dùng: {lastKind === 'unknown' ? '—' : lastKind}
      </p>
    </div>
  );
});
