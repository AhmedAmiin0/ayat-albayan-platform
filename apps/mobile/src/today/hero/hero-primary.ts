import { applyLessonEvent } from '@ab/shared';
import type { TodayLesson } from '../lib/today-lesson';

interface HeroState {
  /** The hero is under way («جارية الآن»). */
  running: boolean;
  /** The salesperson's «اليوم»: nothing to confirm. */
  readOnly: boolean;
  /** «ادخل الحلقة» is inside the join window now. */
  joinOpen: boolean;
}

/**
 * The hero's filled button (docs/29 §3): «تأكيد الحلقة» when the API offers confirm and the status
 * on screen still allows it, else «ادخل الحلقة» inside the join window, else none. Read-only (sales,
 * docs/16), never a confirm and «ادخل الحلقة» only once the lesson runs, as her schedule.
 */
export function heroPrimary(lesson: TodayLesson, state: HeroState): 'confirm' | 'join' | null {
  const offered = lesson.allowed_events?.includes('confirm') ?? false;
  if (!state.readOnly && offered && applyLessonEvent(lesson.status, 'confirm') !== null) return 'confirm';
  return state.joinOpen && (state.running || !state.readOnly) ? 'join' : null;
}
