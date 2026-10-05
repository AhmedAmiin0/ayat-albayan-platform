import { DEFAULT_JOIN_WINDOW, isOpenLesson, joinWindow, type JoinWindowConfig, type LessonView } from '@ab/shared';

export type LivePhase = 'live' | 'soon';
export interface LiveLesson {
  lesson: LessonView;
  phase: LivePhase;
}

/** `live`: started and not yet over. `soon`: inside the settings' join window before the start. */
export function livePhase(lesson: LessonView, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): LivePhase | null {
  if (!isOpenLesson(lesson.status) || joinWindow(lesson, now, win).state !== 'open') return null;
  const t = now.getTime();
  if (t < Date.parse(lesson.starts_at)) return 'soon';
  return t <= Date.parse(lesson.ends_at) ? 'live' : null;
}

/** The lessons to show in «جلسات مباشرة», earliest start first; nothing else is kept. */
export function liveLessons(lessons: readonly LessonView[], now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): LiveLesson[] {
  return lessons
    .flatMap((lesson) => {
      const phase = livePhase(lesson, now, win);
      return phase ? [{ lesson, phase }] : [];
    })
    .sort((a, b) => Date.parse(a.lesson.starts_at) - Date.parse(b.lesson.starts_at));
}
