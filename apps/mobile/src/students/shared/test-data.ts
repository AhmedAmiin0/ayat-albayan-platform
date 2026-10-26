import type { StudentListItem, StudentProfile } from './types';

// Test-only API responses for src/students/*.test.tsx.

export const profile: StudentProfile = {
  id: 's1',
  code: 'AB-0183',
  name: 'هدى',
  status: 'active',
  program: 'quran',
  level: null,
  memorized: null,
  goal: null,
  riwaya: null,
  tz: 'Asia/Riyadh',
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
  guardian_name: 'أم هدى',
  guardian_phone: '+966552147730',
  teacher_name: null,
  ...over,
});

export const page = (items: StudentListItem[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
