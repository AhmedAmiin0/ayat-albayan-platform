import { describe, expect, it } from 'vitest';
import { salesTrialDateRoutes, trialDateRoutes } from '../trial-date.routes';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const LESSON = '22222222-2222-4222-8222-222222222222';
const TEACHER = '33333333-3333-4333-8333-333333333333';
const ROW = {
  lesson_id: LESSON,
  starts_at: '2026-12-01T15:00:00.000Z',
  ends_at: '2026-12-01T15:45:00.000Z',
  teacher: { id: TEACHER, name: 'T' },
  outcome: 'upcoming',
  picked_by: null,
  picked_at: '2026-11-27T10:00:00.000Z',
  moved_from_id: null,
};
const HISTORY = {
  student_id: STUDENT,
  status: 'trial',
  family_tz: 'Europe/London',
  allowed: true,
  count: 1,
  items: [ROW],
  upcoming_id: LESSON,
  student_tz: 'Europe/London',
};
const RESULT = {
  lesson_id: LESSON,
  starts_at: '2026-12-01T15:00:00+00:00',
  ends_at: '2026-12-01T15:45:00+00:00',
  teacher_id: TEACHER,
  moved_from_id: null,
};
const BODY = {
  studentIds: [STUDENT],
  kind: 'trial',
  package: 'trial',
  teacherId: TEACHER,
  byday: [2],
  startTimeLocal: '15:00',
  tz: 'Europe/London',
  durationMin: 45,
  startsOn: '2026-12-01',
  startsAt: '2026-12-01T15:00:00Z',
};

const lines = (routes: Record<string, { method: string; path: string }>) =>
  Object.values(routes).map((r) => `${r.method} ${r.path}`);

describe('trial date routes (R-SCH-06, R-ASST-01)', () => {
  it('keeps the admin paths the api serves today', () => {
    expect(lines(trialDateRoutes)).toEqual([
      'GET /booking/trial-dates',
      'POST /booking/trial-date/check',
      'POST /booking/trial-date',
    ]);
  });

  it('keeps the sales paths the api serves today', () => {
    expect(lines(salesTrialDateRoutes)).toEqual([
      'GET /sales/booking/trial-dates',
      'POST /sales/booking/trial-date/check',
      'POST /sales/booking/trial-date',
    ]);
  });

  it('answers the history with its rows, newest pick first', () => {
    expect(trialDateRoutes.history.response.parse(HISTORY)).toEqual(HISTORY);
  });

  it('refuses a history row with an outcome it does not know', () => {
    const bad = { ...HISTORY, items: [{ ...ROW, outcome: 'lost' }] };
    expect(trialDateRoutes.history.response.safeParse(bad).success).toBe(false);
  });

  it('keeps the prefill fields optional and the gender preference nullable', () => {
    const prefill = { ...HISTORY, program: 'quran', teacher_gender_pref: null };
    expect(salesTrialDateRoutes.history.response.parse(prefill)).toEqual(prefill);
  });

  it('asks the history for one student id', () => {
    const { query } = trialDateRoutes.history;
    expect(query.safeParse({}).success).toBe(false);
    expect(query.parse({ studentId: STUDENT })).toEqual({ studentId: STUDENT });
  });

  it('answers the check with its clashes only', () => {
    expect(trialDateRoutes.check.response.parse({ conflicts: [] })).toEqual({ conflicts: [] });
    expect(trialDateRoutes.check.response.safeParse({}).success).toBe(false);
  });

  it('answers the pick with the new lesson and the one it moved', () => {
    expect(trialDateRoutes.pick.response.parse(RESULT)).toEqual(RESULT);
    const noTeacher = { ...RESULT, teacher_id: undefined };
    expect(salesTrialDateRoutes.pick.response.safeParse(noTeacher).success).toBe(false);
  });

  it('takes a catalog package id in the body as its lesson count', () => {
    const parsed = trialDateRoutes.pick.body.parse({ ...BODY, package: 'starter', kind: undefined });
    expect(parsed.package).not.toBe('starter');
  });
});
