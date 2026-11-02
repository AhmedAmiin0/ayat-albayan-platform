import { describe, expect, it } from 'vitest';
import {
  currentPackageStart,
  dueLessons,
  studentIdsOf,
  type OpenEndedLesson,
  type PackageRow,
} from './auto-held.plan';

const NOW = new Date('2026-11-02T12:00:00Z');
const pkg = (starts_on: string, over: Partial<PackageRow> = {}): PackageRow => ({
  student_id: 's1',
  starts_on,
  status: 'active',
  cancel_kind: null,
  ...over,
});
const lesson = (
  ends_at: string,
  students = ['s1'],
  over: Partial<OpenEndedLesson> = {},
): OpenEndedLesson => ({
  id: `l-${ends_at}`,
  status: 'scheduled',
  ends_at,
  lesson_students: students.map((student_id) => ({ student_id, student: { tz: 'Asia/Riyadh' } })),
  ...over,
});

describe('currentPackageStart', () => {
  const who = { studentId: 's1', tz: 'Asia/Riyadh', at: NOW };

  it('the latest started package, at local midnight in the student’s zone', () => {
    const rows = [pkg('2026-09-01'), pkg('2026-10-20')];
    expect(currentPackageStart(rows, who)).toEqual(new Date('2026-10-19T21:00:00Z'));
  });

  it('ignores cancelled packages, packages still to come and other students', () => {
    const rows = [
      pkg('2026-09-01'),
      pkg('2026-10-25', { status: 'cancelled' }),
      pkg('2026-11-10'),
      pkg('2026-10-30', { student_id: 's2' }),
    ];
    expect(currentPackageStart(rows, who)).toEqual(new Date('2026-08-31T21:00:00Z'));
  });

  it('a stopped course as the current package: nothing is ever closed onto it', () => {
    const rows = [pkg('2026-09-01'), pkg('2026-10-20', { status: 'cancelled', cancel_kind: 'stopped' })];
    expect(currentPackageStart(rows, who)?.getTime()).toBe(8.64e15);
    const lessons = [lesson('2026-10-31T10:00:00Z')];
    expect(dueLessons({ lessons, packages: rows, now: NOW })).toEqual([]);
  });

  it('an unused-cancelled package is ignored; the one before it is current', () => {
    const rows = [pkg('2026-09-01'), pkg('2026-10-20', { status: 'cancelled', cancel_kind: 'unused' })];
    expect(currentPackageStart(rows, who)).toEqual(new Date('2026-08-31T21:00:00Z'));
  });

  it('null without a package (a trial student)', () => {
    expect(currentPackageStart([], who)).toBeNull();
  });
});

describe('dueLessons', () => {
  it('keeps lessons in the window that end after the current package started', () => {
    const lessons = [
      lesson('2026-10-25T10:00:00Z'),
      lesson('2026-10-31T10:00:00Z'),
      lesson('2026-11-02T11:45:00Z'),
    ];
    const due = dueLessons({ lessons, packages: [pkg('2026-10-28')], now: NOW });
    expect(due.map((l) => l.ends_at)).toEqual(['2026-10-31T10:00:00Z']);
  });

  it('a group lesson waits for every student’s package start; a trial (no package) only for the window', () => {
    const group = lesson('2026-10-30T10:00:00Z', ['s1', 's2']);
    const packages = [pkg('2026-10-01'), pkg('2026-11-01', { student_id: 's2' })];
    expect(dueLessons({ lessons: [group], packages, now: NOW })).toEqual([]);
    expect(
      dueLessons({ lessons: [lesson('2026-10-30T10:00:00Z', ['t1'])], packages, now: NOW }),
    ).toHaveLength(1);
  });

  it('never a cancelled or excused lesson, even inside the window', () => {
    const closed = [
      lesson('2026-10-31T10:00:00Z', ['s1'], { status: 'cancelled_by_teacher' }),
      lesson('2026-10-31T11:00:00Z', ['s1'], { status: 'excused' }),
    ];
    expect(dueLessons({ lessons: closed, packages: [], now: NOW })).toEqual([]);
  });

  it('studentIdsOf: every student once', () => {
    expect(studentIdsOf([lesson('a', ['s1', 's2']), lesson('b', ['s2'])])).toEqual(['s1', 's2']);
  });
});
