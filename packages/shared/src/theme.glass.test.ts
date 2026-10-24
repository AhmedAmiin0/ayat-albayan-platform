import { describe, expect, it } from 'vitest';
import { glass, palette, type ThemeName } from './theme.js';

// The glass tab bar keeps the brand colours (owner: «keep the colors»): its fill is `raised` made
// translucent, and the pill's lapis ring is the theme's own lapis.
const rgbOf = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbaOf = (css: string) => (css.match(/[\d.]+/g) ?? []).map(Number);

describe.each(['light', 'dark'] as ThemeName[])('%s glass tab bar', (name) => {
  it('fills with that theme’s raised colour, translucent', () => {
    const [r, g, b, a] = rgbaOf(glass[name].fill);
    expect([r, g, b]).toEqual(rgbOf(palette[name].raised));
    expect(a).toBeGreaterThan(0.5);
    expect(a).toBeLessThan(1);
  });

  it('fades its sheen out by two thirds of the height', () => {
    const { color, stops } = glass[name].sheen;
    expect(color).toBe('#ffffff');
    expect(stops.map(([offset]) => offset)).toEqual([0, 0.42, 0.62]);
    expect(stops.at(-1)?.[1]).toBe(0);
  });

  it('rings the pill in the theme’s lapis', () => {
    const [r, g, b] = rgbaOf(glass[name].pillShadow.split('rgba')[1] ?? '');
    expect([r, g, b]).toEqual(rgbOf(palette[name].lapis));
  });
});
