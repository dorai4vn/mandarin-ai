'use client';

import {
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertIcon, CloseIcon, EyeIcon, EyeOffIcon, SearchIcon } from '../icons';

/**
 * Form controls (COMPONENT_SPEC_V2 §2–4). Always a visible <label> (never placeholder-only), hint
 * and error wired through aria-describedby, aria-invalid on error. 44 (md) / 52 (lg) high,
 * radius 12, 16 px text (iOS does not zoom), 1 px `border.strong` (≥ 3:1).
 */
type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  /** Shown after blur or submit (the caller decides when), not while typing. */
  error?: ReactNode;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  optional?: boolean;
  className?: string;
};

export const controlClasses =
  'w-full rounded-control border border-line-strong bg-surface px-3.5 text-base text-fg shadow-xs ' +
  'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-[var(--duration-fast)] ' +
  'hover:border-fg-subtle focus-visible:border-primary-base ' +
  'aria-invalid:border-error-base ' +
  'disabled:cursor-not-allowed disabled:border-line disabled:bg-[var(--state-disabled-bg)] disabled:text-fg-disabled disabled:shadow-none ' +
  'read-only:bg-sunken';

function useFieldIds(hint: unknown, error: unknown, describedBy?: string, ownId?: string) {
  // A caller-provided id wins, so <label htmlFor>, hint/error ids and aria-controls stay linked.
  const generated = useId();
  const id = ownId ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const ids = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { id, hintId, errorId, describedBy: ids };
}

function FieldFrame({
  id,
  label,
  hint,
  error,
  hintId,
  errorId,
  hideLabel,
  optional,
  className = '',
  children,
}: FieldProps & { id: string; hintId?: string; errorId?: string; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'text-sm font-semibold leading-5 text-fg'}
      >
        {label}
        {optional && <span className="ml-1 font-normal text-fg-subtle">(không bắt buộc)</span>}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="text-sm leading-5 text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm leading-5 text-error-text">
          <AlertIcon width={18} height={18} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

type InputProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    size?: 'md' | 'lg';
  };

export function Input({
  label,
  hint,
  error,
  hideLabel,
  optional,
  className,
  size = 'md',
  'aria-describedby': extra,
  ...props
}: InputProps) {
  const f = useFieldIds(hint, error, extra, props.id);
  return (
    <FieldFrame {...{ label, hint, error, hideLabel, optional, className }} {...f}>
      <input
        {...props}
        id={f.id}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={f.describedBy}
        className={`${controlClasses} ${size === 'lg' ? 'h-13' : 'h-11'}`}
      />
    </FieldFrame>
  );
}

export function Textarea({
  label,
  hint,
  error,
  hideLabel,
  optional,
  className,
  rows = 4,
  'aria-describedby': extra,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const f = useFieldIds(hint, error, extra, props.id);
  return (
    <FieldFrame {...{ label, hint, error, hideLabel, optional, className }} {...f}>
      <textarea
        rows={rows}
        {...props}
        id={f.id}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={f.describedBy}
        className={`${controlClasses} min-h-24 resize-y py-2.5 leading-6`}
      />
    </FieldFrame>
  );
}

/**
 * Password with show/hide toggle (§3). No copy button; autocomplete must be passed by the caller
 * (`current-password` / `new-password`). Keeps the caller's name/autocomplete/testid untouched.
 */
export function PasswordInput({
  label,
  hint,
  error,
  hideLabel,
  optional,
  className,
  'aria-describedby': extra,
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>) {
  const f = useFieldIds(hint, error, extra, props.id);
  const [visible, setVisible] = useState(false);
  return (
    <FieldFrame {...{ label, hint, error, hideLabel, optional, className }} {...f}>
      <div className="relative">
        <input
          autoCapitalize="none"
          spellCheck={false}
          {...props}
          id={f.id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={f.describedBy}
          className={`${controlClasses} h-11 pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-controls={f.id}
          disabled={props.disabled}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-control text-fg-muted hover:text-fg disabled:text-fg-disabled"
        >
          {visible ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
        </button>
      </div>
    </FieldFrame>
  );
}

/** Search (§4): pill, 48 high, magnifier left, clear button right when not empty. */
export function SearchInput({
  label,
  hint,
  hideLabel = true,
  className,
  value,
  onValueChange,
  'aria-describedby': extra,
  ...props
}: Omit<FieldProps, 'error'> &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value' | 'onChange'> & {
    value: string;
    onValueChange: (value: string) => void;
  }) {
  const f = useFieldIds(hint, undefined, extra, props.id);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <FieldFrame {...{ label, hint, hideLabel, className }} {...f}>
      <div className="relative">
        <SearchIcon
          width={20}
          height={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle"
        />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          {...props}
          id={f.id}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && value) {
              e.preventDefault();
              e.stopPropagation(); // one Escape clears the field, it does not also close a dialog
              onValueChange('');
            }
            props.onKeyDown?.(e);
          }}
          aria-describedby={f.describedBy}
          className={`${controlClasses} h-12 rounded-full pl-11 pr-12 [&::-webkit-search-cancel-button]:hidden`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onValueChange('');
              // The button unmounts once the field is empty: keep keyboard focus in the field.
              inputRef.current?.focus();
            }}
            aria-label="Xóa nội dung tìm kiếm"
            className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-[var(--state-hover)] hover:text-fg"
          >
            <CloseIcon width={18} height={18} />
          </button>
        )}
      </div>
    </FieldFrame>
  );
}
