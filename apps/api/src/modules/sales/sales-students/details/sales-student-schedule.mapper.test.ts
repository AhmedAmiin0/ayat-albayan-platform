import { describe, expect, it } from 'vitest';
import type { SalesScheduleRow } from '../../sales';
import { nextStarts, scheduleWindow, toStudentSchedule } from './sales-student-schedule.mapper';
import type { WeeklyRuleRow } from './sales-student.queries';

// Tuesday 27 October 2026, 13:00 in Riyadh.
const NOW = new Date('2026-10-27T10:00:00Z');
const rule = (over: Partial<WeeklyRuleRow> = {}): WeeklyRuleRow => ({
  id: 'r1', byday: [4, 0, 2], start_time_local: '19:00:00', tz: 'Asia/Riyadh', duration_min: 45, package: '12',
  starts_on: '2026-10-01', ends_on: null, status: 'active', teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar' }, ...over,
});
const lesson = (id: string, starts_at: string, students = ['s1']): SalesScheduleRow => ({
  id, starts_at, ends_at: starts_at.replace('T16:00', 'T16:45'), status: 'scheduled', makeup_of_id: null, meeting_link: 'https://meet/secret',
  rule: { package: '12' }, teacher: { id: 't1', display_name_ar: 'أبرار', display_name_en: null, tz: 'Asia/Riyadh', meeting_mode: 'link' },
  lesson_students: students.map((s) => ({ student: { id: s, code: 'AB-0001', name: s, tz: 'Africa/Cairo' } })),
});

describe('nextStarts', () => {
  it('the next start of each weekday in the rule zone, by time (today\'s slot still ahead)', () => {
    expect(nextStarts(rule(), NOW)).toEqual(['2026-10-27T16:00:00.000Z', '2026-10-29T16:00:00.000Z', '2026-11-01T16:00:00.000Z']);
  });

  it('today\'s slot already started: that weekday moves to next week', () => {
    expect(nextStarts(rule(), new Date('2026-10-27T16:00:00Z'))[2]).toBe('2026-11-03T16:00:00.000Z');
  });

  it('not before starts_on, not after ends_on', () => {
    expect(nextStarts(rule({ starts_on: '2026-11-05' }), NOW)).toEqual(['2026-11-05T16:00:00.000Z', '2026-11-08T16:00:00.000Z', '2026-11-10T16:00:00.000Z']);
    expect(nextStarts(rule({ ends_on: '2026-10-29' }), NOW)).toEqual(['2026-10-27T16:00:00.000Z', '2026-10-29T16:00:00.000Z']);
    expect(nextStarts(rule({ ends_on: '2026-10-20' }), NOW)).toEqual([]);
  });

  it('DST: the wall clock stays, the instant moves (London leaves summer time on 25 October)', () => {
    const london = rule({ byday: [0, 3], start_time_local: '18:00', tz: 'Europe/London' });
    expect(nextStarts(london, new Date('2026-10-20T10:00:00Z'))).toEqual(['2026-10-21T17:00:00.000Z', '2026-10-25T18:00:00.000Z']);
  });
});

describe('toStudentSchedule', () => {
  it('weekly: HH:MM, sorted days, both teacher names, the student\'s zone; a trial rule and a finished course are left out', () => {
    const rules = [rule({ id: 'late', byday: [6] }), rule(), rule({ id: 'trial', package: 'trial' }), rule({ id: 'done', ends_on: '2026-10-01' })];
    const { weekly, student_tz } = toStudentSchedule({ rules, lessons: [], own: ['s1'], studentTz: 'Africa/Cairo' }, NOW);
    expect(student_tz).toBe('Africa/Cairo');
    expect(weekly.map((w) => w.rule_id)).toEqual(['r1', 'late']);
    expect(weekly[0]).toEqual({
      rule_id: 'r1', byday: [0, 2, 4], start_time_local: '19:00', tz: 'Asia/Riyadh', duration_min: 45, teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar' },
      next: ['2026-10-27T16:00:00.000Z', '2026-10-29T16:00:00.000Z', '2026-11-01T16:00:00.000Z'],
    });
  });

  it('upcoming: by start, at most 20, no meeting link or classroom mode, `mine` only on her students', () => {
    const rows = Array.from({ length: 22 }, (_, i) => lesson(`l${21 - i}`, `2026-11-${String(10 - Math.floor(i / 3)).padStart(2, '0')}T16:00:0${i % 3}Z`));
    const { upcoming } = toStudentSchedule({ rules: [], lessons: [lesson('g', '2026-10-28T16:00:00Z', ['s1', 'x']), ...rows], own: ['s1'], studentTz: 'Africa/Cairo' }, NOW);
    expect(upcoming).toHaveLength(20);
    expect(upcoming.map((l) => l.starts_at)).toEqual([...upcoming.map((l) => l.starts_at)].sort());
    expect(upcoming[0]).toEqual({
      id: 'g', starts_at: '2026-10-28T16:00:00Z', ends_at: '2026-10-28T16:45:00Z', status: 'scheduled', trial: false, makeup: false,
      teacher: { id: 't1', display_name_ar: 'أبرار', display_name_en: null, tz: 'Asia/Riyadh' },
      students: [{ id: 's1', code: 'AB-0001', name: 's1', tz: 'Africa/Cairo', mine: true }, { id: 'x', code: 'AB-0001', name: 'x', tz: 'Africa/Cairo' }],
    });
    expect(JSON.stringify(upcoming)).not.toMatch(/meet|link|classroom/);
  });

  it('the window is 14 days from now, 20 lessons', () => {
    expect(scheduleWindow(NOW)).toEqual({ from: NOW, to: new Date('2026-11-10T10:00:00Z'), limit: 20 });
  });
});
