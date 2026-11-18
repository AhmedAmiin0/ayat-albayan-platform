import { describe, expect, it } from 'vitest';
import { hijriText } from './hijri.js';

const at = new Date('2026-11-18T09:00:00Z');

describe('hijriText', () => {
  it('reads the Umm al-Qura date in the UI language, ASCII digits, in the zone given', () => {
    const ar = hijriText(at, { tz: 'Asia/Riyadh', locale: 'ar' });
    expect(ar).toContain('1448');
    expect(ar).toContain('جمادى');
    expect(ar).not.toMatch(/[٠-٩]/);
    expect(hijriText(at, { tz: 'Asia/Riyadh', locale: 'en' })).toContain('1448');
  });

  it('the day follows the zone: just after midnight in Riyadh is the day before in Cairo', () => {
    const late = new Date('2026-11-17T21:30:00Z');
    const riyadh = hijriText(late, { tz: 'Asia/Riyadh', locale: 'en' });
    expect(riyadh).not.toBe(hijriText(late, { tz: 'Africa/Cairo', locale: 'en' }));
  });
});
