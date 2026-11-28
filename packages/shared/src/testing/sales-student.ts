import type {
  SalesStudentDetails,
  SalesStudentSubscription,
} from '../sales/student/details-answer.schemas';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const SUB = 'c1000000-0000-4000-8000-0000000000c1';

/** A package of the student's history: eight lessons, three used. */
export const salesStudentSubscription = (
  patch: Partial<SalesStudentSubscription> = {},
): SalesStudentSubscription => ({
  id: SUB,
  package: '8',
  status: 'active',
  starts_on: '2026-09-01',
  renews_on: '2026-10-01',
  ended_at: null,
  created_at: '2026-09-01T10:00:00Z',
  lessons_total: 8,
  lessons_used: 3,
  lessons_remaining: 5,
  lessons_used_before: 0,
  ...patch,
});

/** GET /sales/students/:id of an active student with one package and nothing else yet. */
export const salesStudentDetails = (
  patch: Partial<SalesStudentDetails> = {},
): SalesStudentDetails => ({
  mine: true,
  student: {
    id: STUDENT,
    code: 'AB-0101',
    name: 'ياسمين',
    status: 'active',
    program: 'quran',
    teacher_name: null,
    guardian_phone: null,
  },
  subscriptions: [salesStudentSubscription()],
  current_id: SUB,
  attendance: {
    items: [{ lesson_id: 'l1', starts_at: '2026-10-11T15:00:00.000Z', kind: 'present' }],
    totals: { present: 1, absent: 0, excused: 0, cancelled: 0, unmarked: 0 },
  },
  reports: { items: [], total: 0 },
  schedule: { student_tz: 'Asia/Riyadh', weekly: [], upcoming: [] },
  trial: [],
  package: null,
  family: { guardian_name: null, contact_is_self: false, siblings: [] },
  ...patch,
});
