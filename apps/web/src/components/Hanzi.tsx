import type { HTMLAttributes } from 'react';

/**
 * Chinese text (D-039, TOKENS_V2 §4.1). `lang="zh-Hans"` makes browsers pick Simplified-Chinese
 * glyphs (without it, Han-unified characters such as 直 or 骨 may be drawn in their Japanese form)
 * and selects Noto Sans SC through the `:lang(zh-Hans)` rule in globals.css.
 */
export function HanziText({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span lang="zh-Hans" className={`hanzi ${className}`} {...props} />;
}

/** Pinyin with tone marks (precomposed, NFC) rendered in Inter. */
export function Pinyin({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span lang="zh-Latn-pinyin" className={className} {...props} />;
}
