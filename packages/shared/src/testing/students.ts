import { STUDENT_STATUSES } from '@ab/catalog';
import {
  studentStatusCountsSchema,
  type StudentProfileView,
  type StudentRowView,
  type StudentStatusCountsView,
  type TeacherOptionView,
} from '../people/students/roster';

const STAMP = '2026-10-03T09:00:00.000Z';
const GUARDIAN_ID = '33333333-3333-4333-8333-333333333333';
const TEACHER_ID = '44444444-4444-4444-8444-444444444444';

/** GET /students/teacher-options row with `over` on top. */
export const teacherOptionFixture = (over: Partial<TeacherOptionView> = {}): TeacherOptionView => ({
  id: TEACHER_ID,
  display_name_ar: 'أ. سارة',
  meeting_link: null,
  ...over,
});

/** Every column of `students`, as POST and PATCH /students answer it, with `over` on top. */
export const studentRowFixture = (over: Partial<StudentRowView> = {}): StudentRowView => ({
  id: '11111111-1111-4111-8111-111111111111',
  code: 'AB-0183',
  name: 'سهيلة',
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
  guardian_id: GUARDIAN_ID,
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
  teacher_id: TEACHER_ID,
  tz: 'Asia/Riyadh',
  updated_at: STAMP,
  ...over,
});

/** GET /students/:id with its family, teacher and no siblings, with `over` on top. */
export function studentProfileFixture(over: Partial<StudentProfileView> = {}): StudentProfileView {
  const row = studentRowFixture();
  const phone = '+966501234567';
  return {
    ...row,
    guardian: {
      id: row.guardian_id,
      name: 'أم سهيلة',
      phone_e164: phone,
      students: [{ id: row.id, code: row.code, name: row.name, status: row.status }],
      phones: [{ phone_e164: phone, is_primary: true }],
    },
    teacher: { ...teacherOptionFixture(), display_name_en: null },
    meeting_link: null,
    siblings: [],
    ...over,
  };
}

/** GET /students/status-counts: zero for every status, with `over` on top. */
export const statusCountsFixture = (
  over: Partial<StudentStatusCountsView> = {},
): StudentStatusCountsView =>
  studentStatusCountsSchema.parse({
    ...Object.fromEntries(STUDENT_STATUSES.map((status) => [status, 0])),
    ...over,
  });
