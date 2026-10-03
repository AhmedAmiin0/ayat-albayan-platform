import { DURATIONS, lessonDuration, type LessonView } from '@ab/shared';
import { localDate } from '@/today/timeline';
import { editMode, type EditableLesson, type LessonTimeEditBody } from './types';

// PATCH /lessons/:id/time bodies and the pure rules behind the sheet (R-SCH-11, docs/10 §10), the
// same ones the API enforces: a move starts in the future, a correction stays on its own day and
// ends by now. Times are picked from a grid, never typed (rule 6).

const MINUTE = 60_000;
const STEP = 15 * MINUTE;
/** How far either side of the recorded start a correction looks. ponytail: the same-day filter does the rest. */
const REACH = 4 * 60 * MINUTE;
export const REASON_MAX = 300;

export interface EditState {
  /** The picked start; null = keep the recorded one. */
  picked: string | null;
  durationMin: number;
  reason: string;
  /** The guardian's confirmation toggle; only sent when it matters (willNotify). */
  notify: boolean;
}

/** Every zone that sees this lesson: the teacher's, then each student's. */
function zonesOf(lesson: LessonView): string[] {
  return [...new Set([lesson.teacher.tz, ...lesson.students.map((s) => s.tz)])];
}

/**
 * «تصحيح»: the starts a held lesson may be corrected to, as UTC instants on the quarter hour (and
 * the recorded start itself): on the same local day in every zone, and over by `now` once
 * `durationMin` long. Empty when the lesson ended too recently for any other start.
 */
export function correctStarts(lesson: LessonView, durationMin: number, now: Date): string[] {
  const own = Date.parse(lesson.starts_at);
  const first = Math.ceil((own - REACH) / STEP) * STEP;
  const zones = zonesOf(lesson);
  const day = (ms: number, tz: string) => localDate(new Date(ms), tz);
  const grid = Array.from({ length: (2 * REACH) / STEP + 1 }, (_, i) => first + i * STEP);
  return [...new Set([...grid, own])]
    .sort((a, b) => a - b)
    .filter((ms) => ms + durationMin * MINUTE <= now.getTime())
    .filter((ms) => zones.every((tz) => day(ms, tz) === day(own, tz)))
    .map((ms) => new Date(ms).toISOString());
}

/** The start the form stands for. */
export const chosenStart = (lesson: LessonView, picked: string | null): string => picked ?? lesson.starts_at;

export const lengthOf = (l: Pick<LessonView, 'starts_at' | 'ends_at'>) =>
  Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / MINUTE);

/** Start or length differs from what is recorded (the API answers a no-op with a quiet replay). */
export function isChanged(lesson: LessonView, s: EditState): boolean {
  const moved = Date.parse(chosenStart(lesson, s.picked)) !== Date.parse(lesson.starts_at);
  return moved || s.durationMin !== lengthOf(lesson);
}

/** A move to a later start sends the guardian the new time; a length-only change or a correction does not. */
export function willNotify(lesson: EditableLesson, s: EditState, now: Date): boolean {
  const start = Date.parse(chosenStart(lesson, s.picked));
  return editMode(lesson) === 'move' && start !== Date.parse(lesson.starts_at) && start > now.getTime();
}

/** A length the API and the slot grid accept (30 / 45 / 60 / 90); an odd recorded one must be replaced. */
export const isBookable = (durationMin: number): boolean => DURATIONS.some((d) => d === durationMin);

/** The submit is ready: a bookable length, something changed, a move starts ahead, a correction says why. */
export function canSubmit(lesson: EditableLesson, s: EditState, now: Date): boolean {
  const mode = editMode(lesson);
  if (mode === null || !isBookable(s.durationMin) || !isChanged(lesson, s)) return false;
  const start = Date.parse(chosenStart(lesson, s.picked));
  if (mode === 'correct') return s.reason.trim() !== '' && start + s.durationMin * MINUTE <= now.getTime();
  return start > now.getTime();
}

/** The PATCH body; null while the form cannot be submitted. */
export function editBody(lesson: EditableLesson, s: EditState, now: Date): LessonTimeEditBody | null {
  const mode = editMode(lesson);
  const length = lessonDuration.safeParse(s.durationMin);
  if (mode === null || !length.success || !canSubmit(lesson, s, now)) return null;
  const reason = s.reason.trim().slice(0, REASON_MAX);
  return {
    expectedStartsAt: lesson.starts_at,
    // The time the admin saw, length included: a length-only edit on an older length is refused (stale_time).
    expectedEndsAt: lesson.ends_at,
    startsAt: chosenStart(lesson, s.picked),
    durationMin: length.data,
    ...(reason ? { reason } : {}),
    ...(willNotify(lesson, s, now) ? { notify: s.notify } : {}),
  };
}
