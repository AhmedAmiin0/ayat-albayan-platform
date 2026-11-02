import { describe, expect, it } from 'vitest';
import { teacherName } from './teacher-name.js';

const abrar = { display_name_ar: 'أبرار', display_name_en: 'Abrar' };

describe('teacherName', () => {
  it('English UI: the English name; Arabic UI: always the Arabic one', () => {
    expect(teacherName(abrar, 'en')).toBe('Abrar');
    expect(teacherName(abrar, 'ar')).toBe('أبرار');
  });

  it('falls back to Arabic when there is no English name (null, missing, blank)', () => {
    for (const en of [null, undefined, '  ']) expect(teacherName({ display_name_ar: 'أبرار', display_name_en: en }, 'en')).toBe('أبرار');
  });
});
