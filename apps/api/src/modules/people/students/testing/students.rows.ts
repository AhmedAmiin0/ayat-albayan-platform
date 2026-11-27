import type { Tables } from '@ab/db';

const STAMP = '2026-10-01T00:00:00Z';
const phones = [{ phone_e164: '+966501234567', is_primary: true }];

/** A family as the profile select embeds it, without its students. */
export const family = { id: 'g1', name: 'ام جود', phone_e164: '+966501234567', phones };

/** A complete students row; tests override only what they check. */
export const studentRow = (id: string): Tables<'students'> => ({
  id,
  code: `AB-${id}`,
  name: id,
  status: 'active',
  age: 9,
  brought_at: null,
  brought_by: null,
  code_seq: 183,
  contact_is_self: false,
  created_at: STAMP,
  created_by: null,
  gender: 'female',
  goal: null,
  guardian_id: 'g1',
  is_test: false,
  level: null,
  meeting_link_override: null,
  memorized: null,
  name_normalized: id,
  notes: null,
  profile_id: null,
  program: 'quran',
  riwaya: null,
  teacher_gender_pref: null,
  teacher_id: 't1',
  tz: 'Asia/Riyadh',
  updated_at: STAMP,
});

/** A complete v_student_list row with its embeds, as the list select reads it. */
export const listRow = (id: string) => ({
  id,
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'active' as const,
  program: 'quran' as const,
  tz: 'Asia/Riyadh',
  created_at: STAMP,
  package_remaining: null,
  has_weekly: false,
  guardian: { name: 'ام جود', phone_e164: '+966501234567' },
  teacher: null,
});

/** A sibling as the profile select embeds it. */
export const siblingRef = (id: string) => ({ id, code: null, name: id, status: 'trial' as const });
