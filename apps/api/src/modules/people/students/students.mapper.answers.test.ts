import type { Tables } from '@ab/db';
import { describe, expect, it } from 'vitest';
import { toListItem, toProfile, type StudentListInput } from './students.mapper';

const STAMP = '2026-10-01T00:00:00Z';
const LINK = 'https://meet.google.com/abc';
const ref = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active' as const };
const sibling = { id: 's2', code: null, name: 'جود', status: 'trial' as const };

const student: Tables<'students'> = {
  ...ref,
  age: 9,
  brought_at: null,
  brought_by: null,
  code_seq: 183,
  contact_is_self: false,
  created_at: STAMP,
  created_by: 'u1',
  gender: 'female',
  goal: null,
  guardian_id: 'g1',
  is_test: false,
  level: null,
  meeting_link_override: null,
  memorized: null,
  name_normalized: 'سهيله',
  notes: null,
  profile_id: null,
  program: 'quran',
  riwaya: null,
  teacher_gender_pref: null,
  teacher_id: 't1',
  tz: 'Asia/Riyadh',
  updated_at: STAMP,
};
const phones = [{ phone_e164: '+966501234567', is_primary: true }];
const guardian = { id: 'g1', name: 'ام جود', phone_e164: '+966501234567', phones };
const teacher = { id: 't1', display_name_ar: 'أبرار', display_name_en: null, meeting_link: LINK };

describe('students answers from complete rows (docs/62 part 2)', () => {
  it('a list row answers every key it carries, flattened', () => {
    const row: StudentListInput = {
      ...ref,
      program: 'quran',
      tz: 'Asia/Riyadh',
      created_at: STAMP,
      package_remaining: 2,
      has_weekly: true,
      guardian: { name: 'ام جود', phone_e164: '+966501234567' },
      teacher: { display_name_ar: 'أبرار' },
      is_test: false,
    };
    expect(toListItem(row)).toEqual({
      ...ref,
      program: 'quran',
      tz: 'Asia/Riyadh',
      created_at: STAMP,
      package_remaining: 2,
      has_weekly: true,
      guardian_name: 'ام جود',
      guardian_phone: '+966501234567',
      teacher_name: 'أبرار',
      is_test: false,
    });
  });

  it('a profile answers the whole row, its family, teacher, link and siblings', () => {
    const row = { ...student, guardian: { ...guardian, students: [ref, sibling] }, teacher };
    expect(toProfile(row)).toEqual({
      ...student,
      guardian: { ...guardian, students: [ref, sibling] },
      teacher,
      meeting_link: LINK,
      siblings: [sibling],
    });
  });

  it('a profile with every nullable column null still answers each key', () => {
    const nulls: Tables<'students'> = {
      ...student,
      age: null,
      code: null,
      created_by: null,
      gender: null,
      meeting_link_override: null,
      profile_id: null,
      teacher_gender_pref: null,
      teacher_id: null,
    };
    const row = { ...nulls, guardian: { ...guardian, students: [] }, teacher: null };
    expect(toProfile(row)).toEqual({ ...row, meeting_link: null, siblings: [] });
  });
});
