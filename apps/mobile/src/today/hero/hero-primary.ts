import { applyLessonEvent } from '@ab/shared';
import type { TodayLesson } from '../lib/today-lesson';

interface HeroState {
  /** The hero is under way («جارية الآن»). */
  running: boolean;
  /** The salesperson's «اليوم»: nothing to confirm. */
  readOnly: boolean;
  /** «ادخل الحلقة» is inside the join window now. */
  joinOpen: boolean;
  /** settings.lesson_confirmation_required: OFF, a scheduled lesson is upcoming (no «تأكيد»). */
  required: boolean;
}

const offersConfirm = (lesson: TodayLesson, state: HeroState): boolean =>
  state.required &&
  !state.readOnly &&
  (lesson.allowed_events?.includes('confirm') ?? false) &&
  applyLessonEvent(lesson.status, 'confirm') !== null;

/**
 * The hero's filled button (docs/29 §3): «تأكيد الحلقة» when the academy requires one, the
 * API offers confirm and the status on screen still allows it, else «ادخل الحلقة» inside the
 * join window, else none. Read-only (sales, docs/16): never a confirm, and «ادخل الحلقة»
 * only once the lesson runs, as her schedule.
 */
export function heroPrimary(lesson: TodayLesson, state: HeroState): 'confirm' | 'join' | null {
  if (offersConfirm(lesson, state)) return 'confirm';
  return state.joinOpen && (state.running || !state.readOnly) ? 'join' : null;
}
