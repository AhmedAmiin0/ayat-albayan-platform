import type { PortalLesson } from '@ab/shared';
import { clockOf, type ClockOptions } from '@ab/time';
import type { LessonWait } from './lesson-window.js';

// Why a lesson card has no «ادخل الحلقة» (lessonWait), in the family's words (moved from the web
// portal's LessonAction, docs/50 §7). Each app passes its `t.portal` and its clock.

export interface WaitWords {
  cancelled: string;
  closed: string;
  noWayIn: string;
  /** «يُتاح الدخول من {time}». */
  opensAt: string;
}

export interface WaitTextInput {
  words: WaitWords;
  /** The family's zone and the viewer's 12 / 24 h cycle and locale. */
  clock: ClockOptions;
}

type WaitText = (lesson: PortalLesson, input: WaitTextInput) => string;

const WAIT_TEXT: Record<LessonWait, WaitText> = {
  cancelled: (_, { words }) => words.cancelled,
  closed: (_, { words }) => words.closed,
  noWayIn: (_, { words }) => words.noWayIn,
  opensAt: (lesson, { words, clock }) =>
    words.opensAt.replace('{time}', clockOf(new Date(lesson.window.opens_at), clock)),
};

/** The hint shown instead of the join button. */
export const lessonWaitText = (
  wait: LessonWait,
  lesson: PortalLesson,
  input: WaitTextInput,
): string => WAIT_TEXT[wait](lesson, input);
