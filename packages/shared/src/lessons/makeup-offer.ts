import { makeupEligible } from '../schemas/lessons/booking-extras.js';
import { SCHEDULING_SETTINGS } from '../settings/domains/teaching/scheduling.js';
import type { LessonStudentView, LessonView } from './views.js';

/** Who a lesson's «حجز تعويضي» is for: a makeup to book, and a makeup already booked. */
export interface MakeupOffer {
  /** Eligible (makeupEligible: charged miss, within the makeup window, not a trial or a makeup) with no active makeup yet. */
  open: LessonStudentView[];
  /** Eligible, and a makeup is already booked for them: «التعويض محجوز · <date>». */
  booked: (LessonStudentView & { makeup: NonNullable<LessonStudentView['makeup']> })[];
}

/**
 * The one rule web and mobile share for the makeup button, per student of the lesson (a group's
 * children are separate). The API decides again (makeup_not_eligible, makeup_exists).
 */
export function makeupOffer(lesson: LessonView, now: Date, windowDays: number = SCHEDULING_SETTINGS.makeup_window_days.default): MakeupOffer {
  const facts = { status: lesson.status, trial: lesson.trial === true, makeup: lesson.makeup === true, startsAt: lesson.starts_at };
  const offer: MakeupOffer = { open: [], booked: [] };
  for (const s of lesson.students) {
    if (makeupEligible({ ...facts, chargeable: s.chargeable }, now, windowDays) !== 'ok') continue;
    if (s.makeup) offer.booked.push({ ...s, makeup: s.makeup });
    else offer.open.push(s);
  }
  return offer;
}
