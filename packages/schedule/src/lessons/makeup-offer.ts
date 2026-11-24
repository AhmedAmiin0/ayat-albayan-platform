import { MAKEUP_WINDOW_DAYS, makeupEligible } from '../schemas/booking-extras.js';
import type { LessonStudentView, LessonView } from './views.js';

/** Who a lesson's makeup is for: a makeup to book, and a makeup already booked. */
export interface MakeupOffer {
  /** Eligible (makeupEligible: charged miss, within the makeup window, not a trial or a makeup) with no active makeup yet. */
  open: LessonStudentView[];
  /** Eligible students whose makeup is already booked. */
  booked: (LessonStudentView & { makeup: NonNullable<LessonStudentView['makeup']> })[];
}

/**
 * The one rule web and mobile share for the makeup button, per student of the lesson (a group's
 * children are separate). The API decides again (makeup_not_eligible, makeup_exists).
 */
export function makeupOffer(lesson: LessonView, now: Date, windowDays: number = MAKEUP_WINDOW_DAYS): MakeupOffer {
  const facts = { status: lesson.status, trial: lesson.trial === true, makeup: lesson.makeup === true, startsAt: lesson.starts_at };
  const offer: MakeupOffer = { open: [], booked: [] };
  for (const s of lesson.students) {
    if (makeupEligible({ ...facts, chargeable: s.chargeable }, now, windowDays) !== 'ok') continue;
    if (s.makeup) offer.booked.push({ ...s, makeup: s.makeup });
    else offer.open.push(s);
  }
  return offer;
}
