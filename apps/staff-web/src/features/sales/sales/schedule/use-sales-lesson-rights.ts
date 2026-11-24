import {
  canSalesChangeLesson,
  canSalesConfirm,
  isRunningLesson,
  type SalesScheduleLesson,
} from '@ab/shared';
import { correctionTargets } from '@ab/schedule';
import { usePermissions } from '@/features/people/auth';
import { usePublicConfig } from '@ab/web-kit/lib/settings/public-config';
import { canSalesCorrect } from './correct/correctable';

/** Reschedule waits until a running lesson is over; its drawer offers only join. */
export function useSalesLessonRights(lesson: SalesScheduleLesson, now: Date) {
  const { can } = usePermissions();
  const required = usePublicConfig().lesson_confirmation_required;
  const holds = can('lessons.cancel');
  return {
    confirmable: required && canSalesConfirm(lesson, { now, holds: can('lessons.confirm') }),
    correctable: canSalesCorrect(lesson, { now, required, holds }),
    outcome: holds && correctionTargets(lesson, now).length > 0,
    moves: !isRunningLesson(lesson, now) && canSalesChangeLesson(lesson, { now, can }).reschedule,
  };
}
