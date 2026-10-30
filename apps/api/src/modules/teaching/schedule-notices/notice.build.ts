import type { ScheduleChange } from '@/common/events/lesson-events';
import type { Notice, NoticeStudent, NoticeTeacher } from './notice.types';

// A ScheduleChange and what ScheduleNoticesRepo read for it → the Notice to plan. Pure.

/** A lesson as read: its teacher and every student on it (with their guardian). */
export interface NoticeLessonRow {
  id: string;
  starts_at: string;
  teacher: NoticeTeacher | null;
  lesson_students: readonly { student: NoticeStudent | null }[];
}

/** A lesson a pause took or a resume brought back: its time and teacher. */
export interface TakenLessonRow {
  id: string;
  starts_at: string;
  teacher: NoticeTeacher | null;
}

type Of<K extends ScheduleChange['kind']> = Extract<ScheduleChange, { kind: K }>;
type LessonChange = Of<'lesson_rescheduled'> | Of<'lesson_cancelled'>;
interface PausedInput {
  student: NoticeStudent;
  lessons: readonly TakenLessonRow[];
  now: Date;
}
interface ResumedInput {
  student: NoticeStudent;
  next: TakenLessonRow | null;
}

const studentsOf = (row: NoticeLessonRow): NoticeStudent[] =>
  row.lesson_students.flatMap((ls) => (ls.student ? [ls.student] : []));

/**
 * A moved lesson: its subject is the lesson AND its new start, so a second move of the same lesson
 * is a new notice while a retry of the same one is not. A cancel: the lesson alone (it ends once).
 */
export function lessonNotice(change: LessonChange, row: NoticeLessonRow): Notice {
  const at = new Date(row.starts_at);
  const moved = change.kind === 'lesson_rescheduled';
  return {
    key: change.kind,
    subject: moved ? `${row.id}@${at.getTime()}` : row.id,
    lessonId: row.id,
    at,
    ...(moved ? { from: new Date(change.fromStartsAt) } : {}),
    teachers: row.teacher ? [{ teacher: row.teacher, at }] : [],
    students: studentsOf(row),
    actorId: change.actorId,
  };
}

/** Each distinct teacher with their own earliest lesson among `rows` (sorted by start). */
function firstPerTeacher(rows: readonly TakenLessonRow[]): Notice['teachers'] {
  const seen = new Map<string, { teacher: NoticeTeacher; at: Date }>();
  for (const r of rows) {
    if (!r.teacher || seen.has(r.teacher.id)) continue;
    seen.set(r.teacher.id, { teacher: r.teacher, at: new Date(r.starts_at) });
  }
  return [...seen.values()];
}

/**
 * ONE course_paused per pause (never a lesson_cancelled per lesson it took): the family hears the
 * first lesson taken, each teacher their own first one. Only lessons still to come; none → null.
 */
export function pausedNotice(change: Of<'course_paused'>, input: PausedInput): Notice | null {
  const ahead = input.lessons
    .filter((l) => Date.parse(l.starts_at) > input.now.getTime())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const [first] = ahead;
  if (!first) return null;
  return {
    key: 'course_paused',
    subject: change.pauseId,
    lessonId: null,
    at: new Date(first.starts_at),
    teachers: firstPerTeacher(ahead),
    students: [input.student],
    actorId: change.actorId,
  };
}

/** ONE course_resumed per pause, naming the student's first lesson back (none booked → null). */
export function resumedNotice(change: Of<'course_resumed'>, input: ResumedInput): Notice | null {
  const { next } = input;
  if (!next) return null;
  const at = new Date(next.starts_at);
  return {
    key: 'course_resumed',
    subject: change.pauseId,
    lessonId: next.id,
    at,
    teachers: next.teacher ? [{ teacher: next.teacher, at }] : [],
    students: [input.student],
    actorId: change.actorId,
  };
}
