'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../icons';

/** Centered confirmation dialog (COMPONENT_SPEC_V2 §14, `dialog` variant). */
export function Dialog(props: Omit<Parameters<typeof Sheet>[0], 'variant'>) {
  return <Sheet {...props} variant="dialog" />;
}

/**
 * Bottom sheet on phones / centered dialog from 768 px (COMPONENT_SPEC_V2 §14), on the native
 * <dialog> with showModal(): focus trap, Escape, inert background and ::backdrop for free.
 *  - Focus goes to the first meaningful element (not the close button) when opened, and back to
 *    the opener when closed.
 *  - Closing: Escape, the close button, a click on the backdrop, or the browser/Android Back
 *    button for sheets (one history entry while open; Back pops it — `history`, off for dialogs).
 *  - Page scroll is locked while open.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  variant = 'sheet',
  actions,
  dismissible = true,
  history: withHistory = variant === 'sheet',
  'data-testid': testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** `sheet`: bottom sheet on phones, dialog from 768 px. `dialog`: always centered. */
  variant?: 'sheet' | 'dialog';
  /** Footer actions (dialog): primary on the right on desktop, full-width stack on phones. */
  actions?: ReactNode;
  /** false: a backdrop click does not close (e.g. unsaved input). Esc and buttons still do. */
  dismissible?: boolean;
  /**
   * Push a history entry while open so Back closes it (default for sheets). Off by default for
   * dialogs: a confirmation whose action navigates (router.push) must not race history.back().
   */
  history?: boolean;
  'data-testid'?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const opener = useRef<Element | null>(null);
  const pushed = useRef(false);
  // Set when a link inside the sheet was activated: the navigation owns history then.
  const navigating = useRef(false);
  const prevOverflow = useRef('');
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
      const ok = ':not([disabled]):not([type=hidden]):not([tabindex="-1"])';
      const first =
        d.querySelector<HTMLElement>('[data-autofocus]') ??
        d.querySelector<HTMLElement>(
          ['a[href]', 'button', 'input', 'textarea', 'select']
            .map((t) => `[data-sheet-body] ${t}${ok}`)
            .concat(`[data-sheet-actions] button${ok}`)
            .join(', '),
        );
      first?.focus();
      prevOverflow.current = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      if (withHistory) {
        history.pushState({ ...history.state, sheet: id }, '');
        pushed.current = true;
      }
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, id, withHistory]);

  // Unmounted while open: restore scrolling and drop the history entry.
  useEffect(
    () => () => {
      if (ref.current?.open) document.documentElement.style.overflow = prevOverflow.current;
      if (pushed.current && history.state?.sheet === id) history.back();
    },
    [id],
  );

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
    document.documentElement.style.overflow = prevOverflow.current;
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
        // A plain left click on a link to ANOTHER page: that navigation owns history (links in a
        // sheet should use `replace`, so it replaces the sheet's own entry). Modified clicks
        // (new tab) and same-page links close the sheet normally.
        const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
        const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
        if (a && plain && a.pathname !== location.pathname) navigating.current = true;
      }}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (e.target === ref.current && dismissible) ref.current?.close();
      }}
      data-testid={testId}
      className={`max-h-[90dvh] overflow-y-auto bg-raised p-0 text-fg shadow-lg backdrop:bg-[var(--overlay-scrim)] ${
        variant === 'sheet'
          ? 'm-0 mt-auto w-full max-w-none rounded-t-sheet md:m-auto md:max-w-[480px] md:rounded-panel'
          : 'm-auto w-[calc(100%-2rem)] max-w-[480px] rounded-panel'
      }`}
    >
      <div
        className={
          variant === 'sheet'
            ? 'px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:p-6'
            : 'p-5 md:p-6'
        }
      >
        {variant === 'sheet' && (
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong/40 md:hidden"
          />
        )}
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
        {children && <div data-sheet-body="">{children}</div>}
        {actions && (
          <div
            data-sheet-actions=""
            className="mt-5 flex flex-col-reverse gap-3 md:flex-row md:justify-end"
          >
            {actions}
          </div>
        )}
      </div>
    </dialog>
  );
}
