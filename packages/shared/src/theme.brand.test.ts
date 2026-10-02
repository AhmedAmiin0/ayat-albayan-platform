import { describe, expect, it } from 'vitest';
import { palette, type ThemeName } from './theme.js';

// The light theme is anchored on the academy's own palette (Apps Script «Brand» library, T).
it('light tokens are the brand colours', () => {
  const c = palette.light;
  expect(c.page).toBe('#fdf8f0'); // T.paper, the logo's own background
  expect(c.ink).toBe('#14261e'); // T.ink
  expect(c.lapis).toBe('#14503a'); // T.green2: action
  expect(c.lapisHover).toBe('#0c2a1e'); // T.green
  expect(c.ok).toBe('#1e6b4c'); // T.ok = T.green3
  expect(c.gold).toBe('#c2a24a'); // T.gold
  expect(c.goldSoft).toBe('#d6bc80'); // T.goldSoft
  expect(c.goldWash).toBe('#e7dab4'); // T.gold2
  expect(c.rule).toBe('#e5d9bf'); // T.rule
  expect(c.bad).toBe('#9c3b2e'); // T.bad
});

// OKLCH hue in degrees (Björn Ottosson's matrices), to keep the one-meaning colours apart.
const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
function hue(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}
const apart = (x: string, y: string) => {
  const d = Math.abs(hue(x) - hue(y));
  return Math.min(d, 360 - d);
};

describe.each(['light', 'dark'] as ThemeName[])('%s: one colour, one meaning (docs/07 §1)', (name) => {
  const c = palette[name];

  it('saffron «دورك» never reads as gold ornament (≥ 20° of hue apart)', () => {
    expect(apart(c.act, c.gold)).toBeGreaterThanOrEqual(20);
  });

  it('cinnabar stays red, saffron stays orange (≥ 20° apart)', () => {
    expect(apart(c.bad, c.act)).toBeGreaterThanOrEqual(20);
  });

  it('the action is green (hue 140°–175°)', () => {
    expect(hue(c.lapis)).toBeGreaterThanOrEqual(140);
    expect(hue(c.lapis)).toBeLessThanOrEqual(175);
  });
});

it('hue() matches reference OKLCH hues', () => {
  expect(hue('#ff0000')).toBeCloseTo(29.2, 0);
  expect(hue('#0000ff')).toBeCloseTo(264.1, 0);
});
