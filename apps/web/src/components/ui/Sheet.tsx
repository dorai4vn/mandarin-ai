'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../icons';

/**
 * Bottom sheet on phones / centered dialog from 768 px (COMPONENT_SPEC_V2 §14), on the native
 * <dialog> with showModal(): focus trap, Escape, inert background and ::backdrop for free.
 *  - Focus goes to the first meaningful element (not the close button) when opened, and back to
 *    the opener when closed.
 *  - Closing: Escape, the close button, a click on the backdrop, or the browser/Android Back
 *    button (the sheet pushes one history entry while open; Back pops it).
 *  - Page scroll is locked while open.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  'data-testid': testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  'data-testid'?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const opener = useRef<Element | null>(null);
  const pushed = useRef(false);
  // Set when a link inside the sheet was activated: the navigation owns history then.
  const navigating = useRef(false);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
      // First meaningful element: the first link/button inside the content, not the close button.
      const first = d.querySelector<HTMLElement>(
        '[data-sheet-body] a[href], [data-sheet-body] button',
      );
      first?.focus();
      document.documentElement.style.overflow = 'hidden';
      history.pushState({ ...history.state, sheet: id }, '');
      pushed.current = true;
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, id]);

  useEffect(() => {
    const onPop = () => {
      if (pushed.current) {
        pushed.current = false;
        close.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Called whenever the dialog closes (Escape, close button, backdrop, navigation).
  const onDialogClose = () => {
    document.documentElement.style.overflow = '';
    if (pushed.current) {
      pushed.current = false;
      // Drop the history entry the sheet added — unless a link inside the sheet is navigating
      // (history.back() would cancel that navigation).
      if (!navigating.current && history.state?.sheet === id) history.back();
    }
    navigating.current = false;
    (opener.current as HTMLElement | null)?.focus?.();
    close.current();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      onClose={onDialogClose}
      onCancel={(e) => {
        e.preventDefault();
        ref.current?.close();
      }}
      onClickCapture={(e) => {
        if ((e.target as Element).closest?.('a[href]')) navigating.current = true;
      }}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (e.target === ref.current) ref.current?.close();
      }}
      data-testid={testId}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-sheet bg-surface p-0 text-fg shadow-lg backdrop:bg-[var(--overlay-scrim)] md:m-auto md:max-w-[480px] md:rounded-panel"
    >
      <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:p-6">
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong/40 md:hidden"
        />
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 id={`${id}-title`} className="text-lg font-semibold leading-[26px]">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Đóng"
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-[var(--state-hover)] hover:text-fg"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        {description && (
          <p id={`${id}-desc`} className="mb-3 text-sm text-fg-muted">
            {description}
          </p>
        )}
        <div data-sheet-body="">{children}</div>
      </div>
    </dialog>
  );
}
