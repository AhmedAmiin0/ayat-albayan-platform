import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './icon';

// English is LTR (Phase 7): the RTL-drawn glyphs flip through the `ltr:` variant, so the same
// markup reads right in both directions. Class level: jsdom does not lay out or apply CSS.
const svgClass = (ui: React.ReactElement) => render(ui).container.querySelector('svg')?.getAttribute('class') ?? '';

describe('directional icons follow the page direction', () => {
  it.each(['chevron-left', 'chevron-right', 'logout'] as const)('%s is drawn for RTL and flips in LTR', (name) => {
    const cls = svgClass(<Icon name={name} />);
    expect(cls).toContain('ltr:-scale-x-100');
    expect(cls).not.toMatch(/(^|\s)-scale-x-100/);
  });

  it('reply is drawn for LTR and flips in RTL', () => {
    expect(svgClass(<Icon name="reply" />)).toContain('rtl:-scale-x-100');
  });

  it('non-directional icons never flip', () => {
    expect(svgClass(<Icon name="search" />)).not.toContain('scale-x');
  });
});

