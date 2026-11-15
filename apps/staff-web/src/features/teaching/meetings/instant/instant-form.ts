import type { Duration, InstantLessonRequest, Program } from '@ab/shared';

/** A student picked for the instant lesson (from the student search). */
export interface MeetingStudent {
  id: string;
  name: string;
  code: string | null;
  program: Program;
}

export interface InstantDraft {
  students: readonly MeetingStudent[];
  teacherId: string;
  durationMin: Duration;
  /** The reason to start over a clash; only sent once the API reported one. */
  reason: string;
}

export type DraftProblem = 'students' | 'teacher' | 'reason';

export const DEFAULT_DURATION: Duration = 30;

/** What stops «ابدأ الحلقة»: no student, no teacher, or a clash without a reason. */
export function draftProblem(draft: InstantDraft, clashed: boolean): DraftProblem | null {
  if (draft.students.length === 0) return 'students';
  if (!draft.teacherId) return 'teacher';
  if (clashed && !draft.reason.trim()) return 'reason';
  return null;
}

/** The POST /lessons/instant body; one request id per dialog so a double click starts one lesson. */
export function instantBody(draft: InstantDraft, opts: { clashed: boolean; requestId: string }): InstantLessonRequest {
  return {
    studentIds: draft.students.map((s) => s.id),
    teacherId: draft.teacherId,
    durationMin: draft.durationMin,
    ...(opts.clashed && draft.reason.trim() ? { override: { reason: draft.reason.trim() } } : {}),
    clientRequestId: opts.requestId,
  };
}

/** Adds a student once; picking the same one again removes them (a toggle). */
export function toggleStudent(list: readonly MeetingStudent[], s: MeetingStudent): MeetingStudent[] {
  return list.some((x) => x.id === s.id) ? list.filter((x) => x.id !== s.id) : [...list, s];
}
