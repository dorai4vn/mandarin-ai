// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MnemonicCard } from './MnemonicCard';

describe('MnemonicCard (D4)', () => {
  it('renders pending text fallback with no image and no approval', () => {
    const html = renderToStaticMarkup(createElement(MnemonicCard, { glyph: '山' }));
    expect(html).toContain('data-art-state="pending"');
    expect(html).not.toContain('<img');
    expect(html).toContain('không phải bằng chứng lịch sử');
  });
  it('preview mode is labelled as unapproved candidate', () => {
    const html = renderToStaticMarkup(createElement(MnemonicCard, { glyph: '魚', preview: true }));
    expect(html).toContain('data-art-state="preview"');
    expect(html).toContain('/mnemonic-candidates/yu-fish.webp');
    expect(html).toContain('chưa được chủ dự án duyệt');
  });
  it('unknown glyph renders nothing', () => {
    expect(renderToStaticMarkup(createElement(MnemonicCard, { glyph: '龍' }))).toBe('');
  });
});
