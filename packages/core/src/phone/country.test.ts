import { describe, expect, it } from 'vitest';
import { CountryListSchema, flagOf } from './country';

describe('country data', () => {
  it('a flag is the two regional-indicator letters of the code', () => {
    expect(flagOf('SA')).toBe('🇸🇦');
    expect(flagOf('gb')).toBe('🇬🇧');
    expect(flagOf('EG')).toBe('🇪🇬');
  });

  it('the list schema takes code, calling code and both names, and refuses a bad one', () => {
    const ok = [{ code: 'QA', dial: '+974', ar: 'قطر', en: 'Qatar' }];
    expect(CountryListSchema.parse(ok)).toEqual(ok);
    expect(CountryListSchema.safeParse([{ ...ok[0], dial: '974' }]).success).toBe(false);
    expect(CountryListSchema.safeParse([{ ...ok[0], code: 'QAT' }]).success).toBe(false);
    expect(CountryListSchema.safeParse([]).success).toBe(false);
  });
});
