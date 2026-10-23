import { vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { readerOf } from '../../common/settings/settings.fakes';
import { BookingSettings } from './booking.settings';
import type { CourseLessonQueries } from './course-change.lessons';
import { CourseChangePlanner } from './course-change.planner';
import type { ChangeRule, CourseChangeQueries, CourseSub } from './course-change.queries';
import { CourseChange, type ChangeActor } from './course-change.service';
import type { CourseChangeDeps } from './course-change.writer';
import type { SalesBookingScope } from './sales-booking.ownership';

// Fakes of «تغيير أيام الحلقات» (course-change.service.ts) for its unit tests.

export const S1 = 'c0000000-0000-4000-8000-000000000001';
export const SUB_ID = '00000000-0000-4000-8000-000000000001';
export const REQUEST_ID = '00000000-0000-4000-8000-0000000000aa';
export const SUB: CourseSub = { id: SUB_ID, student_id: S1, package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-01' };
const student = { student_id: S1, student: { meeting_link_override: null } };
export const RULE_A: ChangeRule = {
  id: 'ra',
  status: 'active',
  teacher_id: 't1',
  tz: 'Asia/Riyadh',
  byday: [1],
  start_time_local: '17:00:00',
  duration_min: 45,
  starts_on: '2026-10-05',
  ends_on: '2026-11-10',
  first_rule_id: null,
  package: '8',
  meeting_link: null,
  created_from_lead_id: null,
  schedule_rule_students: [student],
};
export const RULE_B: ChangeRule = { ...RULE_A, id: 'rb', byday: [3], first_rule_id: 'ra' };
export const SALES: ChangeActor = { user: { id: 'b1000000-0000-4000-8000-00000000000b', email: null, role: 'sales' } as AuthUser, role: 'sales' };
export const ADMIN: ChangeActor = { user: { id: 'a1000000-0000-4000-8000-00000000000a', email: null, role: 'admin' } as AuthUser, role: 'admin' };
/** Sun 25 Oct 17:00 + Tue 27 Oct 19:30 (Riyadh). */
export const BODY = {
  subscriptionId: SUB_ID,
  byday: [0, 2],
  startTimeLocal: '17:00',
  dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
  startsOn: '2026-10-25',
  startsAt: '2026-10-25T14:00:00.000Z',
  clientRequestId: REQUEST_ID,
};
export const CLASH = { kind: 'teacher_lesson', startsAt: '2026-10-27T16:30:00.000Z', endsAt: '2026-10-27T17:15:00.000Z' };

export function setup(o: { rules?: ChangeRule[]; owned?: string[] } = {}) {
  const queries = {
    subscription: vi.fn().mockResolvedValue(SUB),
    rules: vi.fn().mockResolvedValue(o.rules ?? [RULE_A, RULE_B]),
    others: vi.fn().mockResolvedValue([]),
    contacts: vi.fn().mockResolvedValue([{ id: S1, name: 'سهيلة', guardian: { id: 'g1', phone_e164: '+966500000001', tz: 'Asia/Riyadh' } }]),
    teacherLink: vi.fn().mockResolvedValue('https://meet.google.com/abc-defg-hij'),
    teacherMode: vi.fn().mockResolvedValue(null),
  };
  // Every Mon/Wed lesson up to the change point exists (none to project); the course used none yet.
  const lessons = {
    ofCourse: vi.fn().mockResolvedValue([]),
    openFrom: vi.fn().mockResolvedValue([{ id: 'l9', status: 'scheduled', rule_id: 'ra' }]),
    held: vi.fn().mockResolvedValue(new Set(['ra:2026-10-19', 'rb:2026-10-21'])),
  };
  const scope = { owned: vi.fn().mockResolvedValue({ leadIds: [], guardianIds: [], studentIds: o.owned ?? [S1], phones: [] }) };
  const writer = {
    replay: vi.fn().mockResolvedValue(null),
    apply: vi.fn().mockResolvedValue({ subscriptionId: SUB_ID, ruleIds: ['n1', 'n2'], endsOn: '2026-11-17' }),
  };
  const planner = new CourseChangePlanner(
    lessons as unknown as CourseLessonQueries,
    queries as unknown as CourseChangeQueries,
    readerOf(BookingSettings), // the seeded 5-week horizon, meeting_link_auto off
  );
  const deps = { checker: { check: vi.fn().mockResolvedValue([]) }, planner, writer };
  const service = new CourseChange(
    queries as unknown as CourseChangeQueries,
    scope as unknown as SalesBookingScope,
    deps as unknown as CourseChangeDeps,
  );
  return { queries, lessons, scope, deps, writer, service };
}
