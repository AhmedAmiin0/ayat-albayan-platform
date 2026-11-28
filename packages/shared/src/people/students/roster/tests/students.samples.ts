export const ID = '11111111-1111-4111-8111-111111111111';
export const ID2 = '22222222-2222-4222-8222-222222222222';
const G = '33333333-3333-4333-8333-333333333333';
const T = '44444444-4444-4444-8444-444444444444';
const STAMP = '2026-10-03T09:00:00.000Z';
const ref = { id: ID, code: 'AB-0183', name: 'سهيلة', status: 'active' as const };

/** Every column of `students`, as POST and PATCH /students answer it. */
export const row = {
  ...ref,
  age: 9,
  brought_at: null,
  brought_by: null,
  code_seq: 183,
  contact_is_self: false,
  created_at: STAMP,
  created_by: null,
  gender: 'female' as const,
  goal: null,
  guardian_id: G,
  is_test: false,
  level: null,
  meeting_link_override: null,
  memorized: null,
  name_normalized: 'سهيله',
  notes: null,
  profile_id: null,
  program: 'quran' as const,
  riwaya: null,
  teacher_gender_pref: null,
  teacher_id: T,
  tz: 'Asia/Riyadh',
  updated_at: STAMP,
};

export const listItem = {
  ...ref,
  program: 'quran' as const,
  tz: 'Asia/Riyadh',
  created_at: STAMP,
  package_remaining: null,
  has_weekly: true,
  guardian_name: 'أم سهيلة',
  guardian_phone: '+966501234567',
  teacher_name: null,
  is_test: false,
};

const sibling = { ...ref, id: ID2, code: null, name: 'جود' };
const link = 'https://meet.example.org/a';
const teacher = { id: T, display_name_ar: 'أ. سارة', display_name_en: null, meeting_link: link };
const phones = [{ phone_e164: '+966501234567', is_primary: true }];
const guardian = { id: G, name: 'أم سهيلة', phone_e164: '+966501234567', phones };

export const profile = {
  ...row,
  guardian: { ...guardian, students: [ref, sibling] },
  teacher,
  meeting_link: link,
  siblings: [sibling],
};
