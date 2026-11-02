import { describe, expect, it } from 'vitest';
import { localizedName } from './localized-name.js';

const fuel = { ar: 'وقود', en: 'Fuel' };

describe('localizedName', () => {
  it('English UI shows the English name; Arabic UI always the Arabic one', () => {
    expect(localizedName(fuel, 'en')).toBe('Fuel');
    expect(localizedName(fuel, 'ar')).toBe('وقود');
  });

  it('falls back to Arabic when English is null, missing or blank', () => {
    for (const en of [null, undefined, '', '   ']) expect(localizedName({ ar: 'وقود', en }, 'en')).toBe('وقود');
  });
});
