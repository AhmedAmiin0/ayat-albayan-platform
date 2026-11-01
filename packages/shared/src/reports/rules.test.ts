import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { ATTENDANCES, GRADES, type LessonStatus } from '@ab/catalog';
import { LESSON_EVENT_TARGET } from '../schedule/lessons/state-machine.js';
import {
  ATTENDANCE_EVENT,
  attended,
  canEditReport,
  editUntil,
  gradeScore,
  nextVersion,
  REPORT_RUBRICS,
  RUBRIC_COLUMN,
  reportBlock,
} from './rules.js';

const at = (iso: string) => new Date(iso);
const SUBMITTED = at('2026-10-01T10:00:00Z');

describe('rubrics (R-REP-02): the six «تقييم البنود» rows of the Google Form', () => {
  it('labels are the form wording, in form order', () => {
    expect(REPORT_RUBRICS.map((r) => ar.reports.rubric[r])).toEqual([
      'التلاوة والنطق',
      'الحفظ الجديد',
      'المراجعة',
      'التجويد',
      'الاستيعاب والتفاعل',
      'الالتزام والحضور',
    ]);
  });

  it('every rubric has its lesson_reports column', () => {
    for (const r of REPORT_RUBRICS) expect(RUBRIC_COLUMN[r]).toBe(`grade_${r}`);
  });
});

describe('ATTENDANCE_EVENT: report attendance → lesson outcome (R-REP-03)', () => {
  it.each([
    ['on_time', 'completed'],
    ['late', 'late'],
    ['excused', 'excused'],
    ['absent', 'no_show'],
  ] as const)('%s → %s', (attendance, status) => {
    expect(LESSON_EVENT_TARGET[ATTENDANCE_EVENT[attendance]]).toBe(status);
  });

  it('only on_time and late count as attended (grades required)', () => {
    expect(ATTENDANCES.filter(attended)).toEqual(['on_time', 'late']);
  });
});

describe('gradeScore (R-REP-05 progress chart)', () => {
  it('ممتاز = 5 … يحتاج إلى مراجعة = 1; null stays null', () => {
    expect(GRADES.map(gradeScore)).toEqual([5, 4, 3, 2, 1]);
    expect(gradeScore(null)).toBeNull();
  });
});

describe('reportBlock: submit only once the lesson started (R-REP-02 date rule)', () => {
  const startsAt = at('2026-10-02T15:00:00Z');
  const rows: [string, LessonStatus, string, ReturnType<typeof reportBlock>][] = [
    ['one ms before the start', 'scheduled', '2026-10-02T14:59:59.999Z', 'not_started'],
    ['at the start', 'scheduled', '2026-10-02T15:00:00Z', null],
    ['after, confirmed', 'confirmed', '2026-10-02T16:00:00Z', null],
    ['completed later the same week', 'completed', '2026-10-05T09:00:00Z', null],
    ['cancelled by the teacher', 'cancelled_by_teacher', '2026-10-02T16:00:00Z', 'lesson_cancelled'],
    ['cancelled by the admin, even before', 'cancelled_by_admin', '2026-10-01T00:00:00Z', 'lesson_cancelled'],
    ['moved', 'rescheduled', '2026-10-02T16:00:00Z', 'lesson_cancelled'],
    ['excused (an outcome, reportable)', 'excused', '2026-10-02T16:00:00Z', null],
  ];
  const cases = rows.map(([name, lessonStatus, now, expected]) => ({ name, lessonStatus, now, expected }));
  it.each(cases)('$name → $expected', (c) => {
    expect(reportBlock({ lessonStatus: c.lessonStatus, lessonStartsAt: startsAt, now: at(c.now) })).toBe(c.expected);
  });
});

describe('canEditReport (R-REP-02: teacher 24 h, admin always)', () => {
  const rows = [
    ['admin, long after', 'admin', SUBMITTED, '2026-12-01T00:00:00Z', true],
    ['teacher, draft (never submitted)', 'teacher', null, '2027-01-01T00:00:00Z', true],
    ['teacher, 23h59 after submit', 'teacher', SUBMITTED, '2026-10-02T09:59:59Z', true],
    ['teacher, exactly 24 h after (closed)', 'teacher', SUBMITTED, '2026-10-02T10:00:00Z', false],
    ['teacher, days after', 'teacher', SUBMITTED, '2026-10-05T10:00:00Z', false],
    ['guardian, never', 'guardian', null, '2026-10-01T10:00:00Z', false],
  ] as const;
  const cases = rows.map(([name, role, submittedAt, now, expected]) => ({ name, role, submittedAt, now, expected }));
  it.each(cases)('$name → $expected', (c) => {
    expect(canEditReport({ role: c.role, submittedAt: c.submittedAt, now: at(c.now), hours: 24 })).toBe(c.expected);
  });

  it('hours = 0 closes a submitted report at once for the teacher', () => {
    expect(canEditReport({ role: 'teacher', submittedAt: SUBMITTED, now: SUBMITTED, hours: 0 })).toBe(false);
  });

  it('editUntil is submit + hours, null for a draft', () => {
    expect(editUntil({ submittedAt: SUBMITTED, hours: 24 })?.toISOString()).toBe('2026-10-02T10:00:00.000Z');
    expect(editUntil({ submittedAt: null, hours: 24 })).toBeNull();
  });
});

describe('nextVersion (R-REP-02 versioned, R-REP-04 resubmit updates)', () => {
  const now = at('2026-10-01T12:00:00Z');
  it('first submit: version 1, submitted now, not an edit', () => {
    expect(nextVersion({ version: 0, submittedAt: null }, now)).toEqual({
      version: 1,
      submittedAt: now,
      editedAt: null,
    });
  });

  it('resubmit: +1, keeps the first submit (window anchor), marks the edit', () => {
    expect(nextVersion({ version: 3, submittedAt: SUBMITTED }, now)).toEqual({
      version: 4,
      submittedAt: SUBMITTED,
      editedAt: now,
    });
  });
});
