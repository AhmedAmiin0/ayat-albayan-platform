import { describe, expect, it } from 'vitest';
import { teacherSearchFilter } from './teachers.mapper';

describe('teacherSearchFilter (R-TCH-01)', () => {
  it.each([
    ['01001234567', 'phone_e164.ilike.*201001234567*'],
    ['٠١٠ 012', 'phone_e164.ilike.*10012*'],
    ['سارة', 'display_name_ar.ilike.*سارة*,display_name_en.ilike.*سارة*'],
    ['Sara', 'display_name_ar.ilike.*Sara*,display_name_en.ilike.*Sara*'],
  ])('%s → %s', (term, filter) => {
    expect(teacherSearchFilter(term)).toBe(filter);
  });

  it('nothing searchable → no filter', () => {
    expect(teacherSearchFilter(' (,) ')).toBeNull();
  });
});
