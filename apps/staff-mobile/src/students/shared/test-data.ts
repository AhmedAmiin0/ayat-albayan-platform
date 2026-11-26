import type { StudentListItem, StudentProfile } from '@ab/shared';

// Test-only API responses for src/students/*.test.tsx.

export const profile: StudentProfile = {
  id: 's1',
  code: 'AB-0183',
  name: 'هدى',
  status: 'active',
  guardian_id: 'g1',
  age: null,
  gender: null,
  program: 'quran',
  level: null,
  memorized: null,
  goal: null,
  riwaya: null,
  tz: 'Asia/Riyadh',
  teacher_id: null,
  meeting_link_override: null,
  notes: null,
  guardian: { id: 'g1', name: 'أم هدى', phone_e164: '+966552147730' },
  teacher: null,
  meeting_link: null,
  siblings: [],
};

export const listItem = (over: Partial<StudentListItem> = {}): StudentListItem => ({
  id: 's1',
  code: 'AB-0183',
  name: 'هدى',
  status: 'active',
  program: 'quran',
  tz: 'Asia/Riyadh',
  created_at: '2026-09-01T09:00:00Z',
  guardian_name: 'أم هدى',
  guardian_phone: '+966552147730',
  teacher_name: null,
  ...over,
});

export const page = (items: StudentListItem[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 25,
});
