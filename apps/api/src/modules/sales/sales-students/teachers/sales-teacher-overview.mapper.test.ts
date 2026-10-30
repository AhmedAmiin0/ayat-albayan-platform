import { describe, expect, it } from 'vitest';
import { NOW, teacherLesson, teacherLessons, teacherRule } from './sales-teacher-overview.fakes';
import { overviewWindow, toTeacherOverview } from './sales-teacher-overview.mapper';

describe('toTeacherOverview', () => {
  it('weekly: one row per weekday in Riyadh (19:00 Cairo = 20:00 Riyadh) with names and codes; a trial rule left out', () => {
    const out = toTeacherOverview({ rules: [teacherRule(), teacherRule({ id: 'rt', package: 'trial' })], lessons: [] }, NOW);
    const students = [{ name: 'ياسمين', code: 'AB-0101' }, { name: 'يوسف', code: '' }];
    expect(out.weekly).toEqual([
      { rule_id: 'r1', weekday: 0, time: '20:00', at: expect.any(String), duration_min: 45, students },
      { rule_id: 'r1', weekday: 2, time: '20:00', at: expect.any(String), duration_min: 45, students },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/meet|secret|290|price/);
    // `at` is the next start: 20:00 Riyadh = 17:00 UTC, so a Cairo viewer reads 19:00 (docs/34).
    expect(out.weekly.map((s) => (s.at ?? '').slice(11, 16))).toEqual(['17:00', '17:00']);
  });

  it('a rule that ended is left out', () => {
    expect(toTeacherOverview({ rules: [teacherRule({ ends_on: '2026-10-01' })], lessons: [] }, NOW).weekly).toEqual([]);
  });

  it('attendance: totals per kind over the past lessons, moved and future ones left out, newest first', () => {
    const future = teacherLesson('f', '2026-10-29T17:00:00+00:00', 'scheduled');
    const { attendance } = toTeacherOverview({ rules: [], lessons: [future, ...teacherLessons().reverse()] }, NOW);
    expect(attendance.days).toBe(30);
    expect(attendance.totals).toEqual({ held: 2, student_absent: 1, cancelled_by_teacher: 1, cancelled_by_admin: 0, other: 0 });
    expect(attendance.latest.map((l) => l.lesson_id)).toEqual(['a', 'b', 'c', 'd']);
    expect(attendance.latest[0]).toEqual({ lesson_id: 'a', starts_at: '2026-10-27T17:00:00.000Z', status: 'completed', students: [{ name: 'ياسمين', code: 'AB-0101' }] });
  });

  it('at most the latest 20 lessons are listed, all of them counted', () => {
    const many = Array.from({ length: 25 }, (_, i) => teacherLesson(`l${i}`, new Date(NOW.getTime() - (i + 1) * 3_600_000).toISOString(), 'completed'));
    const { attendance } = toTeacherOverview({ rules: [], lessons: many }, NOW);
    expect([attendance.latest.length, attendance.totals.held]).toEqual([20, 25]);
  });

  it('the window is the last 30 days up to now', () => {
    expect(overviewWindow(NOW)).toEqual({ from: new Date('2026-09-28T10:00:00Z'), to: NOW });
  });
});
