import { applyLessonEvent } from '@ab/schedule';
import type { TodayLesson } from '@/today/lib/today-lesson';

interface HeroState {
  running: boolean;
  readOnly: boolean;
  joinOpen: boolean;
  /** With it off, a scheduled lesson is upcoming and has no confirm. */
  required: boolean;
}

const offersConfirm = (lesson: TodayLesson, state: HeroState): boolean =>
  state.required &&
  !state.readOnly &&
  (lesson.allowed_events?.includes('confirm') ?? false) &&
  applyLessonEvent(lesson.status, 'confirm') !== null;

/** Confirm only when required and allowed (docs/29 §3), else join; read-only never confirms. */
export function heroPrimary(lesson: TodayLesson, state: HeroState): 'confirm' | 'join' | null {
  if (offersConfirm(lesson, state)) return 'confirm';
  return state.joinOpen && (state.running || !state.readOnly) ? 'join' : null;
}
