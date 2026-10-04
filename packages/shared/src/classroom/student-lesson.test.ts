import { describe, expect, it } from 'vitest';
import { firstName, instantLessonSchema, studentJoinSchema } from './meetings.js';
import { pickStudentLesson } from './student-lesson.js';

const lesson = (id: string, start: string, end: string) => ({ id, starts_at: start, ends_at: end, room_opened_at: null as string | null });
const A = lesson('a', '2026-10-05T16:00:00.000Z', '2026-10-05T17:00:00.000Z');
const B = lesson('b', '2026-10-05T17:00:00.000Z', '2026-10-05T18:00:00.000Z');
const C = lesson('c', '2026-10-07T16:00:00.000Z', '2026-10-07T17:00:00.000Z');
const at = (iso: string) => new Date(iso);

describe('pickStudentLesson', () => {
  it('picks the next lesson when no room is open', () => {
    expect(pickStudentLesson([C, B, A], at('2026-10-05T10:00:00Z'))?.id).toBe('a');
  });

  it('picks the lesson in progress, even when the next room has opened too', () => {
    expect(pickStudentLesson([A, B], at('2026-10-05T16:50:00Z'))?.id).toBe('a');
  });

  it('moves on to the next lesson once the current one has ended', () => {
    expect(pickStudentLesson([A, B], at('2026-10-05T17:00:00Z'))?.id).toBe('b');
  });

  it('keeps the ended lesson during its 2-hour tail when nothing else is open', () => {
    expect(pickStudentLesson([A, C], at('2026-10-05T18:30:00Z'))?.id).toBe('a');
  });

  it('goes to the next lesson after the tail closes, and to null when none is left', () => {
    expect(pickStudentLesson([A, C], at('2026-10-05T19:30:00Z'))?.id).toBe('c');
    expect(pickStudentLesson([A], at('2026-10-05T19:30:00Z'))).toBeNull();
    expect(pickStudentLesson([], at('2026-10-05T19:30:00Z'))).toBeNull();
  });

  it('counts a room opened early by staff as open', () => {
    const early = { ...lesson('e', '2026-10-05T16:00:00.000Z', '2026-10-05T17:00:00.000Z'), room_opened_at: '2026-10-05T13:00:00.000Z' };
    expect(pickStudentLesson([early, C], at('2026-10-05T13:30:00Z'))?.id).toBe('e');
  });
});

describe('meeting schemas', () => {
  const ids = ['8f9c1c1e-3c2a-4a43-9d38-1b8c4d1e2f30', '5d1f0c5a-2b7e-4f5b-8a1d-0f0e7c9b6a21'];

  it('accepts an instant lesson with students, teacher and an allowed duration', () => {
    const ok = instantLessonSchema.safeParse({ studentIds: [ids[0]], teacherId: ids[1], durationMin: 30 });
    expect(ok.success).toBe(true);
  });

  it('refuses no students, repeated students and a duration outside DURATIONS', () => {
    expect(instantLessonSchema.safeParse({ studentIds: [], teacherId: ids[1], durationMin: 30 }).success).toBe(false);
    expect(instantLessonSchema.safeParse({ studentIds: [ids[0], ids[0]], teacherId: ids[1], durationMin: 30 }).success).toBe(false);
    expect(instantLessonSchema.safeParse({ studentIds: [ids[0]], teacherId: ids[1], durationMin: 25 }).success).toBe(false);
  });

  it('makes the student-link name optional but never blank', () => {
    expect(studentJoinSchema.parse({})).toEqual({});
    expect(studentJoinSchema.safeParse({ name: '  ' }).success).toBe(false);
  });

  it('takes the first word of a name', () => {
    expect(firstName('  أحمد محمد علي ')).toBe('أحمد');
    expect(firstName('')).toBe('');
  });
});
