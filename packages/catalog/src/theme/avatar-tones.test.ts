import { describe, expect, it } from 'vitest';
import { avatarTone, avatarTones } from './avatar-tones.js';
import { palette, type ThemeName } from './theme.js';

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(['light', 'dark'] as ThemeName[])('%s avatar tones', (theme) => {
  it('every tone carries `ink` initials at AA (4.5:1)', () => {
    for (const bg of avatarTones[theme]) expect(contrast(palette[theme].ink, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('has as many tones as the other theme', () => {
    expect(avatarTones[theme]).toHaveLength(avatarTones.light.length);
  });
});

describe('avatarTone', () => {
  it('is stable per id and spreads ids over the palette', () => {
    expect(avatarTone('9b2f1c4e-0000-4000-8000-000000000001')).toBe(avatarTone('9b2f1c4e-0000-4000-8000-000000000001'));
    const seen = new Set(Array.from({ length: 60 }, (_, i) => avatarTone(`person-${i}`)));
    expect(seen.size).toBe(avatarTones.light.length);
    expect(avatarTone('')).toBeGreaterThanOrEqual(0);
  });
});
