// Test-only fakes for the booking module: one in-memory academy, every DB touch a vi.fn.
import { bookingRequestSchema, type AcademySettings, type BookingRequest } from '@ab/shared';
import { vi } from 'vitest';
import type { BusyQueries } from '../scheduling/busy.queries';
import { ConflictChecker } from '../scheduling/conflict-checker';
import type { RuleProjectionQueries } from '../scheduling/rule-projection.queries';
import type { AvailabilityQueries } from '../teachers/availability/availability.queries';
import { BookingParties } from './booking.parties';
import { BookingPlanner } from './booking.planner';
import type { BookingQueries, BookingStudent } from './booking.queries';
import { BookingSettings } from './booking.settings';
import { ConflictContext } from './conflict-context';
import { fakeSettings, readerOf } from '../../common/settings/settings.fakes';

export const IDS = {
  teacher: '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11',
  s1: '11111111-1111-4111-8111-111111111111',
  s2: '22222222-2222-4222-8222-222222222222',
  s3: '33333333-3333-4333-8333-333333333333',
  g1: '44444444-4444-4444-8444-444444444444',
  g2: '55555555-5555-4555-8555-555555555555',
  lead: '66666666-6666-4666-8666-666666666666',
  missed: '77777777-7777-4777-8777-777777777777',
  missing: '99999999-9999-4999-8999-999999999999',
};
/** Thu 2026-10-01 11:00 Riyadh. */
export const NOW = new Date('2026-10-01T08:00:00Z');

export const TEACHER = { id: IDS.teacher, tz: 'Africa/Cairo', meeting_link: 'https://meet.jit.si/ab-abrar' };
const riyadh = { id: IDS.g1, phone_e164: '+966552147730', tz: 'Asia/Riyadh' };
const cairo = { id: IDS.g2, phone_e164: '+201001234567', tz: 'Africa/Cairo' };
const student = (id: string, name: string, guardian: BookingStudent['guardian']): BookingStudent => ({
  id,
  name,
  program: 'quran',
  teacher_gender_pref: 'female',
  meeting_link_override: null,
  guardian,
});
export const STUDENTS = [
  student(IDS.s1, 'سهيلة', riyadh),
  student(IDS.s2, 'مريم', riyadh),
  student(IDS.s3, 'يوسف', cairo),
];
/** Sun + Tue 16:00–22:00 Cairo: Sun 17:00 Riyadh (14:00Z) fits both before and after DST. */
export const GRID = [0, 2].map((weekday) => ({
  id: `a${weekday}`,
  weekday,
  start_time: '16:00',
  end_time: '22:00',
  tz: 'Africa/Cairo',
}));

export function fakeQueries() {
  return {
    makeupOriginal: vi.fn(),
    teacher: vi.fn().mockResolvedValue(TEACHER),
    students: vi.fn(async (ids: readonly string[]) => STUDENTS.filter((s) => ids.includes(s.id))),
    lead: vi.fn().mockResolvedValue({ id: IDS.lead, status: 'new', source: null, qualification: {} }),
    guardianByPhone: vi.fn().mockResolvedValue(null),
    createBooking: vi.fn(),
    replay: vi.fn().mockResolvedValue(null),
  };
}

/** bookableSlots answers the real GRID (24/7 off): the outside_availability cases need a grid. */
export function fakeAvailability() {
  return {
    bookableSlots: vi.fn().mockResolvedValue(GRID),
    listTimeOff: vi.fn().mockResolvedValue([]),
    listBusyLessons: vi.fn().mockResolvedValue([]),
  };
}

/** Occupying lessons (BusyQueries) and not-yet-generated rule occurrences (RuleProjectionQueries). */
export function fakeBusy() {
  return {
    busy: { teacherLessons: vi.fn().mockResolvedValue([]), studentLessons: vi.fn().mockResolvedValue([]), courseLessonIds: vi.fn().mockResolvedValue([]) },
    projection: { busy: vi.fn().mockResolvedValue({ teacher: [], students: [] }) },
  };
}

export function fakeContext() {
  const queries = fakeQueries();
  const availability = fakeAvailability();
  const { busy } = fakeBusy();
  const context = new ConflictContext(
    availability as unknown as AvailabilityQueries,
    busy as unknown as BusyQueries,
  );
  return { queries, availability, busy, context };
}

/** A real BookingPlanner + ConflictChecker over the fakes; 5-week horizon as seeded, `over` on the settings. */
export function fakePlanner(over: Partial<AcademySettings> = {}) {
  const queries = fakeQueries();
  const availability = fakeAvailability();
  const { busy, projection } = fakeBusy();
  const checker = new ConflictChecker(
    busy as unknown as BusyQueries,
    availability as unknown as AvailabilityQueries,
    projection as unknown as RuleProjectionQueries,
  );
  const settings = fakeSettings(over);
  const planner = new BookingPlanner(
    new BookingParties(queries as unknown as BookingQueries, readerOf(BookingSettings)),
    checker,
    new BookingSettings(settings),
  );
  return { queries, availability, busy, projection, settings, planner };
}

/** Every non-trial booking carries one (the planner refuses it before planning otherwise). */
const INVOICE = { source: 'upload', path: 'req/a.png' };
const RULE = {
  teacherId: IDS.teacher,
  byday: [0],
  startTimeLocal: '17:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-01',
  package: '8',
};

/** Sundays 17:00 Riyadh, 45 min, 8 lessons, siblings S1 + S2 unless overridden. */
export function bookingRequest(over: Record<string, unknown> = {}): BookingRequest {
  return bookingRequestSchema.parse({ ...RULE, invoice: INVOICE, studentIds: [IDS.s1, IDS.s2], ...over });
}

/** A lead-path trial: new guardian + new student from the conversation. */
export function leadRequest(over: Record<string, unknown> = {}): BookingRequest {
  return bookingRequestSchema.parse({
    ...RULE,
    package: 'trial',
    leadId: IDS.lead,
    guardian: { name: 'أم ريم', phone_e164: '0501234567', tz: 'Asia/Riyadh' },
    newStudent: { name: 'رِيم', tz: 'Asia/Riyadh' },
    ...over,
  });
}
