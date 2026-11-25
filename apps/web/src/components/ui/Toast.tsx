'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertIcon, CloseIcon } from '../icons';

/**
 * Toast (COMPONENT_SPEC_V2 §15): short, non-blocking feedback (saved, synced again, upload done).
 * Errors that need action belong in an ErrorState or Dialog, not only a toast.
 *  - Live regions exist in the layout from the start (aria-live polite for status, assertive for
 *    errors — without role=status/alert so they never collide with page status elements), so
 *    announcements are reliable; focus is NEVER moved to a toast.
 *  - Auto-hide after 4 s (6 s with an action); the timer pauses while hovered or focused.
 *  - At most 3 stacked; a close button on each.
 *  - Phone: above the bottom navigation (safe-area aware); ≥ 768 px: bottom-right.
 */
export type ToastTone = 'neutral' | 'success' | 'warning' | 'error';
export interface ToastInput {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}
interface ToastItem extends Required<Pick<ToastInput, 'message' | 'tone'>> {
  id: number;
  action?: ToastInput['action'];
}

const Ctx = createContext<((t: ToastInput) => void) | null>(null);

/** Shows a toast. Outside a provider it is a no-op (safe in isolated renders). */
export function useToast() {
  return useContext(Ctx) ?? (() => {});
}

const TONE: Record<ToastTone, string> = {
  neutral: 'bg-inverse text-fg-inverse',
  success: 'bg-success-subtle text-success-strong border border-success-base/40',
  warning: 'bg-warning-subtle text-warning-text border border-warning/40',
  error: 'bg-error-subtle text-error-strong border border-error-base/40',
};

function ToastView({ t, onDone }: { t: ToastItem; onDone: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(t.action ? 6000 : 4000);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => onDone(t.id), left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started;
    };
  }, [paused, t.id, onDone]);
  return (
    <div
      data-testid="toast"
      data-tone={t.tone}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex w-full items-start gap-2 rounded-card px-4 py-3 text-sm font-medium shadow-lg ${TONE[t.tone]}`}
    >
      {t.tone === 'error' && <AlertIcon width={18} height={18} className="mt-px shrink-0" />}
      <span className="min-w-0 flex-1 break-words">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick();
            onDone(t.id);
          }}
          className="-my-1 shrink-0 rounded-control px-2 py-1 font-semibold underline underline-offset-2"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={() => onDone(t.id)}
        className="-m-2 flex size-9 shrink-0 items-center justify-center rounded-control opacity-80 hover:opacity-100"
      >
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const show = useCallback((input: ToastInput) => {
    const item: ToastItem = {
      id: next.current++,
      message: input.message,
      tone: input.tone ?? 'neutral',
      action: input.action,
    };
    setItems((list) => [...list, item].slice(-3));
  }, []);
  const done = useCallback((id: number) => {
    setItems((list) => list.filter((x) => x.id !== id));
  }, []);
  const value = useMemo(() => show, [show]);
  const polite = items.filter((t) => t.tone !== 'error');
  const assertive = items.filter((t) => t.tone === 'error');
  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-stretch gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px]"
        data-testid="toast-region"
      >
        <div
          aria-live="polite"
          aria-atomic="false"
          data-testid="toast-live-polite"
          className="flex flex-col gap-2"
        >
          {polite.map((t) => (
            <ToastView key={t.id} t={t} onDone={done} />
          ))}
        </div>
        <div
          aria-live="assertive"
          aria-atomic="false"
          data-testid="toast-live-assertive"
          className="flex flex-col gap-2"
        >
          {assertive.map((t) => (
            <ToastView key={t.id} t={t} onDone={done} />
          ))}
        </div>
      </div>
    </Ctx.Provider>
  );
}
