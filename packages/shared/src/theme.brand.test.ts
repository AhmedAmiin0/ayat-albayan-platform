import { describe, expect, it } from 'vitest';
import { palette, type ThemeName } from './theme.js';

// Green and black, readable, with a green/gold primary (owner, 2026-10-03).
it('light tokens are the green-black palette', () => {
  const c = palette.light;
  expect(c.page).toBe('#ffffff'); // white page
  expect(c.ink).toBe('#0b1410'); // green-black text
  expect(c.lapis).toBe('#166534'); // deep green: the action
  expect(c.onLapis).toBe('#f3d58a'); // gold on the green primary
  expect(c.ok).toBe('#0f766e'); // teal means done/ok
  expect(c.gold).toBe('#b7891f'); // gold decorates
  expect(c.bad).toBe('#b91c1c');
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

  it('the action is green (hue 135°–165°), apart from «ok» teal and the dark cover', () => {
    expect(hue(c.lapis)).toBeGreaterThanOrEqual(135);
    expect(hue(c.lapis)).toBeLessThanOrEqual(165);
    expect(apart(c.lapis, c.ok)).toBeGreaterThanOrEqual(15);
    expect(apart(c.lapis, c.gold)).toBeGreaterThanOrEqual(60);
  });
});

it('hue() matches reference OKLCH hues', () => {
  expect(hue('#ff0000')).toBeCloseTo(29.2, 0);
  expect(hue('#0000ff')).toBeCloseTo(264.1, 0);
});
