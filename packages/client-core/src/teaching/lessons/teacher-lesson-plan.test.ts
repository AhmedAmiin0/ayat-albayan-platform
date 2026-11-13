import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '@ab/shared';
import { joinPhase, reportStage, teacherLessonState } from './teacher-lesson-plan.js';

// A lesson 13:00–14:00 UTC; the window opens 12:45 and closes 16:00 (15 / 120 min defaults).
type Report = { id: string; status: 'draft' | 'submitted'; edit_until?: string | null };
const lesson = (o: {
  status?: LessonStatus;
  confirmed?: string | null;
  reports?: (Report | null | undefined)[];
} = {}) => ({
  status: o.status ?? 'scheduled',
  starts_at: '2026-11-13T13:00:00Z',
  ends_at: '2026-11-13T14:00:00Z',
  teacher_confirmed_at: o.confirmed ?? null,
  room_opened_at: null,
  students: (o.reports ?? [null]).map((report) => ({ report })),
});
const at = (hhmm: string) => new Date(`2026-11-13T${hhmm}:00Z`);
const draft: Report = { id: 'r1', status: 'draft' };
const sent = (until: string): Report => ({ id: 'r2', status: 'submitted', edit_until: until });

describe('reportStage', () => {
  it('null before the start and on a closed lesson', () => {
    expect(reportStage(lesson(), at('12:59'))).toBeNull();
    expect(reportStage(lesson({ status: 'cancelled_by_teacher' }), at('15:00'))).toBeNull();
    expect(reportStage(lesson({ status: 'rescheduled' }), at('15:00'))).toBeNull();
  });

  it('write for no report or an old cache, resume for a draft', () => {
    expect(reportStage(lesson(), at('13:00'))).toBe('write');
    expect(reportStage(lesson({ reports: [undefined] }), at('14:30'))).toBe('write');
    expect(reportStage(lesson({ reports: [draft] }), at('14:30'))).toBe('resume');
  });

  it('window while edit_until is ahead, then done', () => {
    const l = lesson({ reports: [sent('2026-11-13T14:42:00Z')] });
    expect(reportStage(l, at('14:30'))).toBe('window');
    expect(reportStage(l, at('14:42'))).toBe('done');
  });

  it('a group: any missing report writes, before any draft resumes', () => {
    const until = '2026-11-13T15:00:00Z';
    expect(reportStage(lesson({ reports: [sent(until), null] }), at('14:30'))).toBe('write');
    expect(reportStage(lesson({ reports: [sent(until), draft] }), at('14:30'))).toBe('resume');
    expect(reportStage(lesson({ status: 'excused', reports: [null] }), at('14:30'))).toBe('write');
  });
});

describe('teacherLessonState', () => {
  const until = '2026-11-13T14:42:00Z';
  it.each([
    ['awaiting before her «سأحضر»', lesson(), '12:00', 'awaiting'],
    ['confirmed after it', lesson({ confirmed: '2026-11-13T09:00:00Z' }), '12:00', 'confirmed'],
    ['running from the start', lesson({ confirmed: '2026-11-13T09:00:00Z' }), '13:00', 'running'],
    ['write at ends_at', lesson(), '14:00', 'write'],
    ['resume on a draft', lesson({ reports: [draft] }), '14:10', 'resume'],
    ['window with 12 minutes left', lesson({ reports: [sent(until)] }), '14:30', 'window'],
    ['status at edit_until', lesson({ reports: [sent(until)] }), '14:42', 'status'],
    ['status on a cancelled lesson', lesson({ status: 'cancelled_by_teacher' }), '12:00', 'status'],
  ] as const)('%s', (_name, l, hhmm, word) => {
    expect(teacherLessonState(l, at(hhmm))).toBe(word);
  });
});

describe('joinPhase: the ends_at cut', () => {
  it('off before the window, live until ends_at, after until the close, then off', () => {
    expect(joinPhase(lesson(), at('12:44'))).toBe('off');
    expect(joinPhase(lesson(), at('12:45'))).toBe('live');
    expect(joinPhase(lesson(), at('13:59'))).toBe('live');
    expect(joinPhase(lesson(), at('14:00'))).toBe('after');
    expect(joinPhase(lesson(), at('16:00'))).toBe('after');
    expect(joinPhase(lesson(), at('16:01'))).toBe('off');
  });

  it('off on a closed lesson and follows the live window settings', () => {
    expect(joinPhase(lesson({ status: 'completed' }), at('13:30'))).toBe('off');
    const win = { opensBeforeMin: 5, closesAfterMin: 10 };
    expect(joinPhase(lesson(), at('12:50'), win)).toBe('off');
    expect(joinPhase(lesson(), at('14:11'), win)).toBe('off');
  });
});
