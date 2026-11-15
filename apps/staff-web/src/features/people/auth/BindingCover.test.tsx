import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BindingCover } from './BindingCover';

// The corner pieces sit on logical offsets and flip with the direction, so the cover is the same
// in Arabic (RTL) and English (LTR). Class level: jsdom does not lay out.
function corners(): string[] {
  const { container } = render(<BindingCover />);
  return [...container.querySelectorAll('svg')]
    .map((s) => s.getAttribute('class') ?? '')
    .filter((c) => c.includes('absolute size-16'));
}

describe('BindingCover corners (LTR mirror)', () => {
  it('uses start/end offsets only, never left/right', () => {
    const all = corners();
    expect(all).toHaveLength(4);
    for (const c of all) expect(c).not.toMatch(/(^|\s|:)(left|right)-/);
    expect(all.filter((c) => c.includes(' start-[30px]'))).toHaveLength(2);
    expect(all.filter((c) => c.includes(' end-[30px]'))).toHaveLength(2);
  });

  it('the piece on the right flips: start in RTL, end in LTR', () => {
    for (const c of corners()) {
      expect(c).toContain(c.includes(' start-[30px]') ? 'rtl:-scale-x-100' : 'ltr:-scale-x-100');
    }
  });

  it('the bottom pieces flip vertically in both directions', () => {
    const bottom = corners().filter((c) => c.includes('bottom-[30px]'));
    expect(bottom).toHaveLength(2);
    for (const c of bottom) expect(c).toContain('-scale-y-100');
  });
});
