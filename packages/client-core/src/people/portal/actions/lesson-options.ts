import { isFamilyActionable, type PortalLesson } from '@ab/shared';
import { isOpenLesson } from '@ab/schedule';

// What «خيارات الحلقة» offers on one lesson, and what its card says. Pure,
// shared by the family app and the web portal.

export type LessonOption = 'confirm' | 'request' | 'decline' | 'withdraw';

/** The family's request state the card's chip shows instead of the lesson's status. */
export type RequestChip = 'pendingChip' | 'rejectedChip';

/** The outcome line under «أعتذر» (a preview) or on an excused lesson (what happened). */
export type CountsLine = 'countsYes' | 'countsNo' | 'excusedYes' | 'excusedNo';

const WAITING: readonly LessonOption[] = ['confirm', 'withdraw', 'decline'];
const OPEN: readonly LessonOption[] = ['confirm', 'request', 'decline'];

const isWaiting = (l: PortalLesson): boolean => l.family?.request?.status === 'pending';

/** «سأحضر» only while it still needs the confirmation (a confirmed lesson needs none). */
const fits = (l: PortalLesson) => (o: LessonOption) => o !== 'confirm' || l.status === 'scheduled';

/** The student's own lesson, open and not started (a group lesson is the academy's to change). */
const isFamilyOwn = (l: PortalLesson, now: Date): boolean =>
  l.family !== undefined && !l.family.group && isFamilyActionable(l, now);

/** The options, in the menu's order; none once it started or closed, or from an older API. */
export function lessonOptions(lesson: PortalLesson, now: Date): LessonOption[] {
  if (!isFamilyOwn(lesson, now)) return [];
  return (isWaiting(lesson) ? WAITING : OPEN).filter(fits(lesson));
}

const CHIPS: Readonly<Record<string, RequestChip>> = {
  pending: 'pendingChip',
  rejected: 'rejectedChip',
};

/** «بانتظار رد الأكاديمية» / «لم يُقبل الطلب» on an open lesson; null = its status chip. */
export function requestChip(lesson: PortalLesson): RequestChip | null {
  const status = lesson.family?.request?.status;
  return status && isOpenLesson(lesson.status) ? (CHIPS[status] ?? null) : null;
}

/** «أعتذر»'s preview line: counts from the package or not (the late cancel rule). */
export const declineLine = (lesson: PortalLesson): CountsLine =>
  lesson.family?.counts ? 'countsYes' : 'countsNo';

/** An excused lesson's line; null for any other. */
export function excusedLine(lesson: PortalLesson): CountsLine | null {
  if (lesson.status !== 'excused' || !lesson.family) return null;
  return lesson.family.counts ? 'excusedYes' : 'excusedNo';
}

/** «أكّدتم حضور … لهذه الحلقة»: a confirmed lesson the family still sees ahead. */
export const confirmedLine = (lesson: PortalLesson, now: Date): boolean =>
  lesson.status === 'confirmed' && isFamilyOwn(lesson, now);
