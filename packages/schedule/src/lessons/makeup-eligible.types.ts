import type { LessonStatus } from '@ab/catalog';

export interface MakeupOriginal {
  status: LessonStatus;
  /** lesson_students.chargeable of the student being made up for. */
  chargeable: boolean;
  /** Its rule is a trial. */
  trial: boolean;
  /** It is itself a makeup. */
  makeup: boolean;
  /** ISO instant. */
  startsAt: string;
}
export type MakeupVerdict = 'ok' | 'status' | 'not_charged' | 'trial' | 'too_old' | 'is_makeup';
