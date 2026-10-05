import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchInput } from './search-input';

describe('SearchInput', () => {
  it('is a named searchbox with a decorative magnifier before the text (logical inline-start)', () => {
    const { container } = render(<SearchInput aria-label="بحث" placeholder="ابحث…" />);
    const box = screen.getByRole('searchbox', { name: 'بحث' });
    expect(box.getAttribute('placeholder')).toBe('ابحث…');
    const glyph = container.querySelector('svg');
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');
    expect(glyph?.getAttribute('class')).toContain('start-3');
    expect(box.className).toContain('ps-10');
    expect(`${glyph?.getAttribute('class')} ${box.className}`).not.toMatch(/\b(?:pl|pr|left|right)-/);
  });

  it('has the stock control height, the same as the Button beside it (no smaller override)', () => {
    render(<SearchInput aria-label="بحث" />);
    const cls = screen.getByRole('searchbox').className;
    expect(cls).toContain('min-h-11');
    expect(cls).toContain('sm:min-h-10');
    expect(cls).not.toContain('sm:min-h-9');
  });

  it('forwards the ref and keeps the caller\'s classes on the input', () => {
    let el: HTMLInputElement | null = null;
    render(<SearchInput aria-label="بحث" className="w-full" ref={(n) => (el = n)} />);
    expect(el).toBe(screen.getByRole('searchbox'));
    expect(screen.getByRole('searchbox').className).toContain('w-full');
  });
});
