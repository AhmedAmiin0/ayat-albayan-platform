import { describe, expect, it } from 'vitest';
import { toStudentFamily } from './sales-student-family.mapper';
import type { DetailsStudentRow } from './sales-student.repo';

const sibling = { id: 's2', code: 'AB-0002', name: 'أخ', status: 'active' as const };
const self = { id: 's1', code: 'AB-0001', name: 'طالب', status: 'trial' as const };
const row = (over: Partial<DetailsStudentRow> = {}): DetailsStudentRow => ({
  ...self,
  program: 'quran',
  tz: 'Africa/Cairo',
  teacher: null,
  guardian: { phone_e164: '+201000000000', name: 'ولي الأمر', students: [self, sibling] },
  ...over,
});

describe('toStudentFamily', () => {
  it('the guardian name and the other students, the student itself left out', () => {
    const family = toStudentFamily(row(), true);
    expect(family).toEqual({ guardian_name: 'ولي الأمر', contact_is_self: false, siblings: [sibling] });
  });

  it('no guardian name for a viewer who cannot open the chats; the siblings stay', () => {
    const family = toStudentFamily(row(), false);
    expect(family).toMatchObject({ guardian_name: null, siblings: [sibling] });
  });

  it('a student who is their own contact', () => {
    expect(toStudentFamily(row({ contact_is_self: true }), true).contact_is_self).toBe(true);
  });

  it('no guardian row: no name, no siblings', () => {
    const family = toStudentFamily(row({ guardian: null }), true);
    expect(family).toEqual({ guardian_name: null, contact_is_self: false, siblings: [] });
  });
});
