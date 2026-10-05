import { describe, expect, it } from 'vitest';
import { palette, type ThemeName } from './theme.js';

// «Emerald Mint» (owner, 2026-10-05): white pages, white text on the emerald primary, a mint sidebar.
it('light tokens are the emerald mint palette', () => {
  const c = palette.light;
  expect(c.page).toBe('#ffffff'); // white page
  expect(c.ink).toBe('#17201c'); // green-grey text
  expect(c.lapis).toBe('#047857'); // emerald: the action as text
  expect(c.lapisFill).toBe('#047857'); // the primary button's fill
  expect(c.onLapis).toBe('#ffffff'); // white on the green primary
  expect(c.ok).toBe('#15803d'); // green means done/ok
  expect(c.cover).toBe('#ecfdf5'); // the light mint sidebar
  expect(c.coverInk).toBe('#064e3b'); // dark green text on it
  expect(c.gold).toBe('#b7891f'); // gold: small ornament only
  expect(c.bad).toBe('#b91c1c');
});

// Soft dark (owner): green-grey surfaces, never near-black; the same emerald fill, a mint-teal link.
it('dark tokens are soft green-grey with a separate link colour', () => {
  const c = palette.dark;
  expect(c.page).toBe('#1e2623');
  expect(c.raised).toBe('#27312d');
  expect(c.lapisFill).toBe('#047857');
  expect(c.onLapis).toBe('#ffffff');
  expect(c.lapis).toBe('#5eead4');
  expect(c.cover).toBe('#18201d'); // the dark sidebar
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

  it('the action is emerald to mint-teal (hue 135°–185°), apart from «ok» and gold', () => {
    expect(hue(c.lapis)).toBeGreaterThanOrEqual(135);
    expect(hue(c.lapis)).toBeLessThanOrEqual(185);
    expect(apart(c.lapis, c.ok)).toBeGreaterThanOrEqual(15);
    expect(apart(c.lapis, c.gold)).toBeGreaterThanOrEqual(60);
  });
});

it('hue() matches reference OKLCH hues', () => {
  expect(hue('#ff0000')).toBeCloseTo(29.2, 0);
  expect(hue('#0000ff')).toBeCloseTo(264.1, 0);
});
