import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MediaGlyph } from './MediaGlyph';

describe('MediaGlyph', () => {
  it('draws a hidden solid glyph per name and keeps the caller class', () => {
    const { container } = render(<MediaGlyph name="pause" className="size-7" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toContain('size-7');
    expect(svg?.getAttribute('class')).toContain('fill-current');
    expect(container.querySelector('path')?.getAttribute('d')).toMatch(/^M5\.5 4h3/);
  });

  it('the play glyph has its own path and the default size', () => {
    const { container } = render(<MediaGlyph name="play" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('size-4');
    expect(container.querySelector('path')?.getAttribute('d')).toMatch(/^M6\.5 4\.2/);
  });
});
