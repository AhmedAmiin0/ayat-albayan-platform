import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateTile } from './DateTile';
import { MonthDiamond } from './MonthDiamond';
import { PlayGlyph } from './PlayGlyph';

const LATE = '2026-11-12T22:30:00Z';

describe('DateTile (boards: the weekday over the day)', () => {
  it('the day in the family’s zone: Friday 13 in Riyadh, Thursday 12 in UTC', () => {
    const riyadh = render(<DateTile at={LATE} tz="Asia/Riyadh" />).container;
    expect(riyadh.textContent).toBe('الجمعة13');
    const utc = render(<DateTile at={LATE} tz="UTC" />).container;
    expect(utc.textContent).toBe('الخميس12');
  });

  it('decorative and family only: hidden from screen readers, shown under data-skin=family', () => {
    const tile = render(<DateTile at={LATE} tz="UTC" />).container.firstElementChild;
    expect(tile?.getAttribute('aria-hidden')).toBe('true');
    expect(tile?.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(tile?.className).toContain('family:flex');
  });
});

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
