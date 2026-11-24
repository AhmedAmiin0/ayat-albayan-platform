import type { PortalLessonFamily, PortalLessonRequest } from '@ab/shared';
import { isChargeable } from '@ab/schedule';
import type { PortalLessonRow, PortalRequestRow } from './portal-lessons.repo';

interface FamilyContext {
  /** The caller's student on the lesson (its own chargeable flag). */
  studentId: string;
  now: Date;
  /** settings.late_cancel_hours: null = the policy is off. */
  lateCancelHours: number | null;
  /** PortalLessonsRepo.requests of the lessons read. */
  requests: readonly PortalRequestRow[];
}

/** The family's request states the card shows: waiting, or declined with the note. */
const SHOWN: Readonly<Record<string, PortalLessonRequest['status']>> = {
  pending: 'pending',
  rejected: 'rejected',
};

/** The lesson's newest family request, when it still waits or was declined (else none). */
export function latestRequest(
  rows: readonly PortalRequestRow[],
  lessonId: string,
): PortalLessonRequest | null {
  const own = rows.filter((r) => r.lesson_id === lessonId);
  const [last] = own.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const status = last ? SHOWN[last.status] : undefined;
  if (!last || !status) return null;
  return {
    id: last.id,
    status,
    proposed_starts_at: new Date(last.proposed_starts_at).toISOString(),
    note: last.note,
    decision_note: last.decision_note,
    decided_at: last.decided_at && new Date(last.decided_at).toISOString(),
  };
}

/** More than one student: the family's buttons would act on the others' lesson too. */
export const isGroupLesson = (row: PortalLessonRow): boolean => row.lesson_students.length > 1;

/** `counts` uses the cancel's own rule under late_cancel_hours. */
export function familyOf(row: PortalLessonRow, ctx: FamilyContext): PortalLessonFamily {
  const excused = row.status === 'excused';
  const own = row.lesson_students.find((s) => s.student_id === ctx.studentId);
  const preview = isChargeable({
    status: 'excused',
    startsAt: new Date(row.starts_at),
    at: ctx.now,
    lateCancelHours: ctx.lateCancelHours,
  });
  return {
    counts: excused ? (own?.chargeable ?? true) : preview,
    group: isGroupLesson(row),
    request: latestRequest(ctx.requests, row.id),
  };
}
