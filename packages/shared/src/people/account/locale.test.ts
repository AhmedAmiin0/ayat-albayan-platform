import { describe, expect, it } from 'vitest';
import { localeUpdateSchema } from './locale';

describe('localeUpdateSchema (PATCH /me/locale)', () => {
  it('takes ar and en', () => {
    expect(localeUpdateSchema.parse({ locale: 'en' })).toEqual({ locale: 'en' });
    expect(localeUpdateSchema.parse({ locale: 'ar' })).toEqual({ locale: 'ar' });
  });

  it('refuses another language, a missing one and extra keys', () => {
    expect(localeUpdateSchema.safeParse({ locale: 'fr' }).success).toBe(false);
    expect(localeUpdateSchema.safeParse({}).success).toBe(false);
    expect(localeUpdateSchema.safeParse({ locale: 'ar', id: 'x' }).success).toBe(false);
  });
});
