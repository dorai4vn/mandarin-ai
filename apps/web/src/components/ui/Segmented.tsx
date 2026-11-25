'use client';

import { useId, type ReactNode } from 'react';

/**
 * Segmented choice (one value of a few), on native radios: arrow keys, one tab stop, form-friendly.
 * Looks like the segmented Tabs (COMPONENT_SPEC_V2 §5) but is a value picker, not tab panels.
 */
export function Segmented<T extends string | number>({
  legend,
  hideLegend = false,
  options,
  value,
  onChange,
  className = '',
  'data-testid': testId,
}: {
  legend: string;
  hideLegend?: boolean;
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'data-testid'?: string;
}) {
  const name = useId();
  return (
    <fieldset className={`flex flex-wrap items-center gap-2 ${className}`} data-testid={testId}>
      <legend className={hideLegend ? 'sr-only' : 'float-left mr-1 text-sm text-fg-muted'}>
        {legend}
      </legend>
      <div className="inline-flex rounded-control bg-subtle p-1">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className="cursor-pointer rounded-[8px] px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg has-[:checked]:bg-raised has-[:checked]:text-fg has-[:checked]:shadow-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--border-focus)]"
          >
            <input
              type="radio"
              name={name}
              value={String(o.value)}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
