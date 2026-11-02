import { describe, expect, it } from 'vitest';
import { palette, type Palette, type ThemeName } from './theme.js';

// Every text/background pair the apps use, on the brand palette, in both themes (WCAG 2.x, sRGB).
// docs/07 §3 prints these numbers; regenerate that table from here, never by hand.
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
const SURFACES: Key[] = ['margin', 'page', 'raised', 'sunk'];
/** Every token that is ever text: body ink, links/ghost buttons (lapis), and the three status tones. */
const TEXT: Key[] = ['ink', 'ink2', 'ink3', 'lapis', 'ok', 'act', 'bad'];
const WASHES: Key[] = ['goldWash', 'lapisWash', 'okSoft', 'actSoft', 'badSoft', 'neutralSoft'];

/** [foreground, background] pairs beyond TEXT × SURFACES: each needs 4.5:1 (AA). */
const PAIRS: [Key, Key][] = [
  // a tone on its own soft background (chips, accent rows, alerts)
  ['lapis', 'lapisWash'],
  // the Today hero card's time, an active summary column's label and count (docs/29 §2–3)
  ['coverInk', 'lapisWash'],
  ['ink3', 'lapisWash'],
  ['act', 'lapisWash'],
  ['ok', 'okSoft'],
  ['act', 'actSoft'],
  ['bad', 'badSoft'],
  // body text on every wash (tinted rows, the error toast, the selected fihris tile)
  ...WASHES.flatMap((w): [Key, Key][] => [['ink', w], ['ink2', w]]),
  ['ink3', 'neutralSoft'],
  // text on fills: the primary (its own fill token) + hover, destructive-solid, the inverse toast
  ['onLapis', 'lapisFill'],
  ['onLapis', 'lapisHover'],
  ['onBad', 'badSolid'],
  ['onInverse', 'inverse'],
  // the login binding: wordmark and programme line on every leather tone
  ['goldOnCover', 'leather'],
  ['goldOnCover', 'leatherDeep'],
  ['goldOnCover', 'leatherLift'],
  ['coverInk', 'leather'],
  ['coverInk', 'leatherLift'],
  ['coverInk', 'cover'],
];

/** Non-text 3:1 (WCAG 1.4.11): the only edge of a control, and the toast's status glyph. */
const EDGES: [Key, Key][] = [
  ['ruleInput', 'raised'],
  ['ruleInput', 'page'],
  ['inverseGold', 'inverse'],
  // delivery ticks on our bubble (sunk on desktop, lapisWash on phones) and on a thread row (raised)
  ...(['sunk', 'lapisWash', 'raised'] as Key[]).flatMap((bg): [Key, Key][] => [['read', bg], ['tick', bg], ['act', bg]]),
];

describe.each(['light', 'dark'] as ThemeName[])('%s theme contrast (docs/07 §3)', (name) => {
  const c = palette[name];
  const cross = TEXT.flatMap((t) => SURFACES.map((s): [Key, Key] => [t, s]));

  it.each([...cross, ...PAIRS])('%s on %s ≥ 4.5', (fg, bg) => {
    expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(EDGES)('%s against %s ≥ 3', (fg, bg) => {
    expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(3);
  });

  // Read vs delivered is told by colour alone, as in WhatsApp (docs/07 principle 3 carve-out): keep
  // the two inks apart in lightness too, not only in hue.
  it('read ticks stand apart from the grey ticks (≥ 1.4)', () => {
    expect(contrast(c.read, c.tick)).toBeGreaterThanOrEqual(1.4);
  });
});

it('contrast() matches the WCAG reference values', () => {
  expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  expect(contrast('#ffffff', '#ffffff')).toBe(1);
});
