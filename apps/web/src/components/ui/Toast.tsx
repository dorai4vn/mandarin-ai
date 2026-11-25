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
 *  - Auto-hide after 4 s; the timer pauses while hovered or focused. A toast with an action stays
 *    until it is used or closed (WCAG 2.2.1).
 *  - Shown while a modal dialog is open → queued until it closes (top layer / inert).
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
  /** Focused element when the toast was raised: focus returns there if the toast held it. */
  opener: Element | null;
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
  // Hover and focus pause independently (leaving with the pointer while focus is inside keeps it).
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const left = useRef(4000);
  const self = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => {
    // Removing a toast that holds focus must not drop focus to <body>.
    if (self.current?.contains(document.activeElement)) {
      const next = [...document.querySelectorAll<HTMLElement>('[data-testid="toast"]')].find(
        (el) => el !== self.current,
      );
      const back = t.opener?.isConnected ? (t.opener as HTMLElement) : null;
      (next?.querySelector('button') ?? back ?? document.querySelector('h1'))?.focus?.();
    }
    onDone(t.id);
  }, [onDone, t.id, t.opener]);
  useEffect(() => {
    // A toast with an action (e.g. "Hoàn tác") does not auto-hide: keyboard and screen-reader
    // users must be able to reach it (WCAG 2.2.1). Others hide after 4 s.
    if (paused || t.action) return;
    const started = Date.now();
    const timer = setTimeout(dismiss, left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started;
    };
  }, [paused, t.action, dismiss]);
  return (
    <div
      ref={self}
      data-testid="toast"
      data-tone={t.tone}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className={`pointer-events-auto flex w-full items-start gap-2 rounded-card px-4 py-3 text-sm font-medium shadow-lg ${TONE[t.tone]}`}
    >
      {t.tone === 'error' && <AlertIcon width={18} height={18} className="mt-px shrink-0" />}
      <span className="min-w-0 flex-1 break-words">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick();
            dismiss();
          }}
          className="-my-1 shrink-0 rounded-control px-2 py-1 font-semibold underline underline-offset-2"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={dismiss}
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
      opener: document.activeElement,
    };
    const add = () => setItems((list) => [...list, item].slice(-3));
    // Content outside a modal <dialog> is inert and below the top layer: a toast shown while one
    // is open (e.g. "Đã xóa" from a confirm button, before the dialog closes) waits until it
    // closes, so it is visible, reachable and announced.
    let modal: HTMLDialogElement | null = null;
    try {
      modal = document.querySelector<HTMLDialogElement>('dialog:modal');
    } catch {
      modal = null; // `:modal` unsupported
    }
    if (modal) modal.addEventListener('close', add, { once: true });
    else add();
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
