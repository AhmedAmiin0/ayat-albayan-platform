import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonthDiamond } from './MonthDiamond';
import { PlayGlyph } from './PlayGlyph';

describe('MonthDiamond and PlayGlyph', () => {
  it('the ◆ shows only under the family skin', () => {
    const diamond = render(<MonthDiamond />).container.firstElementChild;
    expect(diamond?.getAttribute('aria-hidden')).toBe('true');
    expect(diamond?.className).toContain('family:inline-block');
  });

  it('play and pause draw different glyphs, both decorative', () => {
    const play = render(<PlayGlyph />).container.querySelector('path')?.getAttribute('d');
    const svg = render(<PlayGlyph playing />).container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelector('path')?.getAttribute('d')).not.toBe(play);
  });
});
