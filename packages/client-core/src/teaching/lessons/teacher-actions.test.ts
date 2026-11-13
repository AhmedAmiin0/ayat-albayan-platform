import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '@ab/shared';
import {
  cancelAnswerSchema,
  confirmedChipShown,
  confirmedNow,
  teacherCanAct,
  teacherCanConfirm,
  teacherConfirmed,
  teacherLessonPaths,
} from './teacher-actions.js';

const now = new Date('2026-11-11T12:00:00Z');
const lesson = (status: LessonStatus, at: string, confirmed: string | null = null) => ({
  status,
  starts_at: at,
  teacher_confirmed_at: confirmed,
});

describe('teacher lesson actions (docs/46 C3/C4)', () => {
  it('open and ahead: she can act', () => {
    expect(teacherCanAct(lesson('scheduled', '2026-11-11T13:00:00Z'), now)).toBe(true);
    expect(teacherCanAct(lesson('confirmed', '2026-11-11T13:00:00Z'), now)).toBe(true);
  });

  it('started or closed: no action', () => {
    expect(teacherCanAct(lesson('scheduled', '2026-11-11T12:00:00Z'), now)).toBe(false);
    expect(teacherCanAct(lesson('completed', '2026-11-12T13:00:00Z'), now)).toBe(false);
    expect(teacherCanAct(lesson('cancelled_by_teacher', '2026-11-12T13:00:00Z'), now)).toBe(false);
  });

  it('confirm only once', () => {
    const done = lesson('scheduled', '2026-11-12T13:00:00Z', '2026-11-11T11:00:00Z');
    expect(teacherConfirmed(done)).toBe(true);
    expect(teacherCanConfirm(done, now)).toBe(false);
    expect(teacherCanConfirm(lesson('scheduled', '2026-11-12T13:00:00Z'), now)).toBe(true);
    expect(teacherConfirmed({ ...done, teacher_confirmed_at: undefined })).toBe(false);
  });

  it('the chip: the answer bridges until the re-read, never for a moved or closed lesson', () => {
    const open = lesson('scheduled', '2026-11-12T13:00:00Z');
    const answer = lesson('scheduled', '2026-11-12T13:00:00Z', '2026-11-11T11:00:00Z');
    expect(confirmedChipShown(open, { answer, now })).toBe(true);
    const moved = lesson('scheduled', '2026-11-13T13:00:00Z');
    expect(confirmedNow(moved, answer)).toBe(false);
    const held = { ...answer, status: 'completed' as const };
    expect(confirmedChipShown(held, { answer, now })).toBe(false);
    const started = lesson('scheduled', '2026-11-11T12:00:00Z', '2026-11-11T11:00:00Z');
    expect(confirmedChipShown(started, { answer: undefined, now })).toBe(false);
  });

  it('paths', () => {
    expect(teacherLessonPaths.cancel('l1')).toBe('/teachers/me/lessons/l1/cancel');
    expect(teacherLessonPaths.confirm('l1')).toBe('/teachers/me/lessons/l1/confirm-attendance');
    expect(teacherLessonPaths.attendance('s1')).toBe('/teachers/me/students/s1/attendance');
  });
});

describe('cancelAnswerSchema', () => {
  it('keeps the fields the write-through cancel patches, refuses another shape', () => {
    const answer = { id: 'l1', status: 'cancelled_by_teacher', cancel_reason: 'سفر', extra: 1 };
    expect(cancelAnswerSchema.parse(answer)).toEqual({
      id: 'l1',
      status: 'cancelled_by_teacher',
      cancel_reason: 'سفر',
    });
    expect(cancelAnswerSchema.safeParse({ id: 'l1' }).success).toBe(false);
  });
});
