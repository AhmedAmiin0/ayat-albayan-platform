import { describe, expect, it } from 'vitest';
import { glass, palette, type ThemeName } from './theme.js';

// The glass tab bar keeps the brand colours (owner: «keep the colors»): its fill is `raised` made
// translucent, the sheen is white, and the tab labels on it stay readable (docs/29 §7).
type Rgb = [number, number, number];
const rgbOf = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbaOf = (css: string) => (css.match(/[\d.]+/g) ?? []).map(Number);
/** `css` (rgba) laid over `under`. */
const over = (css: string, under: Rgb): Rgb => {
  const [r = 0, g = 0, b = 0, a = 1] = rgbaOf(css);
  return [r, g, b].map((c, i) => c * a + (under[i] ?? 0) * (1 - a)) as Rgb;
};
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(['light', 'dark'] as ThemeName[])('%s glass tab bar', (name) => {
  const g = glass[name];
  const c = palette[name];
  /** The capsule over the screen ground (the worst case: nothing brighter scrolled under it). */
  const capsule = over(g.fill, rgbOf(c.margin));

  it('fills with that theme’s raised colour, translucent', () => {
    const [r, gr, b, a] = rgbaOf(g.fill);
    expect([r, gr, b]).toEqual(rgbOf(c.raised));
    expect(a).toBeGreaterThan(0.5);
    expect(a).toBeLessThan(1);
  });

  it('runs a white sheen top to bottom: bright, dim at the middle, a lift at the foot', () => {
    const { color, stops } = g.sheen;
    expect(color).toBe('#ffffff');
    expect(stops.map(([offset]) => offset)).toEqual([0, 0.5, 1]);
    const [top, mid, foot] = stops.map(([, opacity]) => opacity) as [number, number, number];
    expect(mid).toBeLessThan(foot);
    expect(foot).toBeLessThan(top);
  });

  it('keeps the tab labels AA on the capsule: the active one (lapis) on its pill, the others', () => {
    const pill = over(g.pill.fill, capsule);
    expect(contrast(rgbOf(c.lapis), pill)).toBeGreaterThanOrEqual(4.5);
    const idle = rgbOf(name === 'dark' ? c.ink2 : c.ink3);
    expect(contrast(idle, capsule)).toBeGreaterThanOrEqual(4.5);
  });
});
