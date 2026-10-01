import { describe, expect, it } from 'vitest';
import { palette, type Palette, type ThemeName } from './theme.js';

// docs/07 §3 measured pairs, re-checked on the RN hex tokens in both themes (WCAG 2.x, sRGB).
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

type Key = keyof Palette;
/** [foreground, background]: text pairs need 4.5:1 (AA). */
const TEXT: [Key, Key][] = [
  ['ink', 'margin'],
  ['ink2', 'page'],
  ['ink3', 'sunk'],
  ['ink3', 'margin'],
  ['lapis', 'page'],
  ['onLapis', 'lapis'],
  ['onBad', 'badSolid'],
  ['act', 'actSoft'],
  ['ok', 'okSoft'],
  ['bad', 'badSoft'],
  ['bad', 'page'],
  ['ink2', 'neutralSoft'],
  ['onInverse', 'inverse'],
  ['goldOnCover', 'leather'],
];

describe.each(['light', 'dark'] as ThemeName[])('%s theme contrast (docs/07 §3)', (name) => {
  const c = palette[name];

  it.each(TEXT)('%s on %s ≥ 4.5', (fg, bg) => {
    expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('ruleInput on raised ≥ 3 (the only edge of inputs and secondary buttons)', () => {
    expect(contrast(c.ruleInput, c.raised)).toBeGreaterThanOrEqual(3);
  });
});

it('contrast() matches the WCAG reference values', () => {
  expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  expect(contrast('#ffffff', '#ffffff')).toBe(1);
});
