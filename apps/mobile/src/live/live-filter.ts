import {
  DEFAULT_JOIN_WINDOW,
  isOpenLesson,
  joinWindow,
  type JoinWindowConfig,
  type LessonView,
} from '@ab/shared';

type LivePhase = 'live' | 'soon';

/** `live`: started and not yet over. `soon`: inside the settings' join window before the start. */
export function livePhase(
  lesson: LessonView,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): LivePhase | null {
  if (!isOpenLesson(lesson.status) || joinWindow(lesson, now, win).state !== 'open') return null;
  const t = now.getTime();
  if (t < Date.parse(lesson.starts_at)) return 'soon';
  return t <= Date.parse(lesson.ends_at) ? 'live' : null;
}
