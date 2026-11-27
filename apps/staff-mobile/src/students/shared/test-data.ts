import type { StudentListItem, StudentProfileView } from '@ab/shared';
import { studentProfileFixture } from '@ab/shared/testing';

// Test-only API responses for src/students/*.test.tsx.

export const profile: StudentProfileView = studentProfileFixture({
  id: 's1',
  code: 'AB-0183',
  name: 'هدى',
  guardian_id: 'g1',
  age: null,
  gender: null,
  teacher_id: null,
  guardian: {
    id: 'g1',
    name: 'أم هدى',
    phone_e164: '+966552147730',
    students: [{ id: 's1', code: 'AB-0183', name: 'هدى', status: 'active' }],
    phones: [{ phone_e164: '+966552147730', is_primary: true }],
  },
  teacher: null,
});

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
