import { describe, expect, it } from 'vitest';
import { lessonNotice, pausedNotice, resumedNotice, type TakenLessonRow } from './notice.build';
import { AT, FROM, lessonRow, NOW, student, teacher } from './schedule-notices.fakes';

const taken = (id: string, startsAt: string, t = teacher()): TakenLessonRow =>
  ({ id, starts_at: startsAt, teacher: t });
const PAUSE = { pauseId: 'P1', studentId: 'S1', actorId: 'pSALES' };

describe('lessonNotice: which event → which key, and its subject', () => {
  it('a move names the lesson AND its new start (a second move is a new notice), with the old time', () => {
    const n = lessonNotice({ kind: 'lesson_rescheduled', lessonId: 'L1', fromStartsAt: FROM.toISOString(), actorId: 'pA' }, lessonRow());
    expect(n).toMatchObject({ key: 'lesson_rescheduled', subject: `L1@${AT.getTime()}`, lessonId: 'L1', at: AT, from: FROM, actorId: 'pA' });
    expect(n.teachers).toEqual([{ teacher: teacher(), at: AT }]);
  });

  it('a move gives the family WhatsApp only when FamilyMoveNotice chose it; a cancel always', () => {
    const move = { kind: 'lesson_rescheduled', lessonId: 'L1', fromStartsAt: FROM.toISOString(), actorId: null } as const;
    expect(lessonNotice({ ...move, familyNotice: true }, lessonRow()).familyWhatsApp).toBe(true);
    expect(lessonNotice({ ...move, familyNotice: false }, lessonRow()).familyWhatsApp).toBe(false);
    expect(lessonNotice(move, lessonRow()).familyWhatsApp).toBe(false);
    const cancel = { kind: 'lesson_cancelled', lessonId: 'L1', actorId: null } as const;
    expect(lessonNotice(cancel, lessonRow()).familyWhatsApp).toBe(true);
  });

  it('a cancel names the lesson only; every student on it; a lesson without a teacher → no teacher', () => {
    const students = [{ student: student() }, { student: null }];
    const row = lessonRow({ teacher: null, lesson_students: students });
    const n = lessonNotice({ kind: 'lesson_cancelled', lessonId: 'L1', actorId: null }, row);
    expect(n).toMatchObject({ key: 'lesson_cancelled', subject: 'L1', teachers: [] });
    expect(n.students.map((s) => s.id)).toEqual(['S1']);
    expect(n.from).toBeUndefined();
  });
});

describe('pausedNotice: ONE course_paused per pause, never one lesson_cancelled per lesson', () => {
  const other = teacher({ id: 'T2', profile_id: 'pT2' });
  const lessons = [
    taken('l3', '2026-11-09T08:00:00Z', other),
    taken('l1', '2026-11-02T08:00:00Z'),
    taken('l2', '2026-11-05T08:00:00Z'),
    taken('past', '2026-10-30T08:00:00Z'),
  ];

  it('the family hears the first lesson taken; each teacher their own first one', () => {
    const n = pausedNotice({ kind: 'course_paused', ...PAUSE, lessonIds: [] }, { student: student(), lessons, now: NOW });
    expect(n).toMatchObject({ key: 'course_paused', subject: 'P1', lessonId: null, at: AT });
    expect(n?.teachers.map((t) => [t.teacher.id, t.at.toISOString()])).toEqual([
      ['T1', '2026-11-02T08:00:00.000Z'],
      ['T2', '2026-11-09T08:00:00.000Z'],
    ]);
  });

  it('nothing still to come → no notice', () => {
    const past = [taken('past', '2026-10-30T08:00:00Z')];
    expect(pausedNotice({ kind: 'course_paused', ...PAUSE, lessonIds: [] }, { student: student(), lessons: past, now: NOW })).toBeNull();
  });
});

describe('resumedNotice: ONE course_resumed with the first lesson back', () => {
  it('names the first lesson back and its teacher', () => {
    const n = resumedNotice({ kind: 'course_resumed', ...PAUSE }, { student: student(), next: taken('n1', AT.toISOString()) });
    expect(n).toMatchObject({ key: 'course_resumed', subject: 'P1', lessonId: 'n1', at: AT });
    expect(n?.teachers.map((t) => t.teacher.id)).toEqual(['T1']);
  });

  it('no lesson booked yet → no notice', () => {
    expect(resumedNotice({ kind: 'course_resumed', ...PAUSE }, { student: student(), next: null })).toBeNull();
  });
});
