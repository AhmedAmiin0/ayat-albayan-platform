import type { Tables } from '@ab/db';
import { describe, expect, it } from 'vitest';
import {
  studentNameOrCodeFilter,
  toListItem,
  toProfile,
  toStudentInsert,
  toStudentPatch,
  type StudentProfileRow,
} from './students.mapper';

describe('students mapper', () => {
  it('insert: drops request-only keys, sets guardian, name_normalized, created_by (R-STU-01, R-STU-03)', () => {
    const dto = {
      name: 'سهيلة',
      tz: 'Asia/Riyadh',
      program: 'quran' as const,
      status: 'trial' as const,
      guardian: { name: 'ام جود', phone_e164: '+966501234567', tz: 'Asia/Riyadh' },
      force: true,
    };
    expect(toStudentInsert({ dto, guardianId: 'g1', actorId: 'u1' })).toEqual({
      name: 'سهيلة',
      tz: 'Asia/Riyadh',
      program: 'quran',
      status: 'trial',
      guardian_id: 'g1',
      name_normalized: 'سهيله',
      created_by: 'u1',
    });
  });

  it('patch: renormalises the name only when it changes', () => {
    expect(toStudentPatch({ level: 'جزء عم' })).toEqual({ level: 'جزء عم' });
    expect(toStudentPatch({ name: 'جودى' })).toEqual({ name: 'جودى', name_normalized: 'جودي' });
  });

  it('list item flattens guardian and teacher', () => {
    const row = {
      id: 's1',
      code: 'AB-0183',
      name: 'سهيلة',
      status: 'active' as const,
      program: 'quran' as const,
      tz: 'Asia/Riyadh',
      created_at: '2026-10-01T00:00:00Z',
    };
    const out = toListItem({ ...row, guardian: { name: 'ام جود', phone_e164: '+966501234567' }, teacher: null });
    expect(out).toEqual({ ...row, guardian_name: 'ام جود', guardian_phone: '+966501234567', teacher_name: null });
  });

  describe('profile (R-STU-05)', () => {
    const sib = (id: string) => ({ id, code: `AB-${id}`, name: id, status: 'trial' as const });
    const base = {
      id: 's1',
      meeting_link_override: null,
      guardian: { id: 'g1', name: 'ام جود', phone_e164: '+966501234567', students: [sib('s1'), sib('s2')] },
      teacher: { id: 't1', display_name_ar: 'أبرار', meeting_link: 'https://meet.google.com/abc' },
    } as Partial<Tables<'students'>> as StudentProfileRow;

    it("meeting link defaults to the teacher's", () => {
      expect(toProfile(base).meeting_link).toBe('https://meet.google.com/abc');
    });

    it('the override wins; no teacher and no override is null', () => {
      const own = { ...base, meeting_link_override: 'https://zoom.us/j/1' };
      expect(toProfile(own).meeting_link).toBe('https://zoom.us/j/1');
      expect(toProfile({ ...base, teacher: null }).meeting_link).toBeNull();
    });

    it('siblings exclude the student itself (R-STU-04)', () => {
      expect(toProfile(base).siblings.map((s) => s.id)).toEqual(['s2']);
    });
  });

  it('name/code filter searches the normalised name and the code', () => {
    expect(studentNameOrCodeFilter('سهيلة')).toBe('name_normalized.ilike.*سهيله*,code.ilike.*سهيلة*');
    expect(studentNameOrCodeFilter('AB-0183')).toBe('name_normalized.ilike.*ab-0183*,code.ilike.*AB-0183*');
    expect(studentNameOrCodeFilter(' ')).toBeNull();
  });
});
