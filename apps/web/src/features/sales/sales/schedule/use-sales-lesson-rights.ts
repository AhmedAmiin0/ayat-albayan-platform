import {
  canSalesChangeLesson,
  canSalesConfirm,
  correctionTargets,
  type SalesScheduleLesson,
} from '@ab/shared';
import { usePermissions } from '@/features/people/auth';
import { usePublicConfig } from '@/lib/settings/public-config';
import { canSalesCorrect } from './correct/correctable';

/** Which SalesLessonSteps apply to `lesson` at `now` for the signed-in salesperson. */
export function useSalesLessonRights(lesson: SalesScheduleLesson, now: Date) {
  const { can } = usePermissions();
  const required = usePublicConfig().lesson_confirmation_required;
  const holds = can('lessons.cancel');
  return {
    confirmable: required && canSalesConfirm(lesson, { now, holds: can('lessons.confirm') }),
    correctable: canSalesCorrect(lesson, { now, required, holds }),
    outcome: holds && correctionTargets(lesson, now).length > 0,
    moves: canSalesChangeLesson(lesson, { now, can }).reschedule,
  };
}
