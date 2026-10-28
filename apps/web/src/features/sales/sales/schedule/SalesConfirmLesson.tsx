import type { SalesLessonMoved, SalesScheduleLesson } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { errorCode, lessonErrorText } from '@/features/teaching/schedule';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

/** Any scheduled lesson that has not ended, with lessons.confirm (owner 2026-10-28); the API checks again. */
export function canConfirmLesson(lesson: SalesScheduleLesson, input: { now: Date; holds: boolean }): boolean {
  return input.holds && lesson.status === 'scheduled' && Date.parse(lesson.ends_at) > input.now.getTime();
}

/** The confirm's own wording for lesson_ended and invalid_transition; the lessons wording otherwise. */
export function confirmErrorText(error: unknown): string {
  const code = errorCode(error);
  if (code === 'lesson_ended') return t.sales.lessonActions.confirmEnded;
  if (code === 'invalid_transition') return t.sales.lessonActions.confirmInvalid;
  return lessonErrorText(error);
}

interface SalesConfirmLessonProps {
  lessonId: string;
  /** The drawer then shows the lesson «مؤكدة» while the day re-reads. */
  onConfirmed: () => void;
}

/**
 * «تأكيد الحلقة» in sales' lesson drawer (owner 2026-10-28, docs/16): POST /sales/lessons/:id/confirm on
 * ANY lesson (the family's «نعم» arrives in a chat every assistant sees), scheduled → confirmed, no message
 * to anyone. The drawer shows it only when canConfirmLesson.
 */
export function SalesConfirmLesson({ lessonId, onConfirmed }: SalesConfirmLessonProps) {
  const client = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => apiSend<SalesLessonMoved>('POST', `/sales/lessons/${lessonId}/confirm`),
    onSuccess: async () => {
      onConfirmed();
      await client.invalidateQueries({ queryKey: ['sales', 'schedule'] });
    },
  });
  return (
    <div className="grid justify-items-start gap-2">
      {confirm.isError && <FormAlert>{confirmErrorText(confirm.error)}</FormAlert>}
      <Button type="button" size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
        {confirm.isPending ? t.common.saving : t.sales.lessonActions.confirm}
      </Button>
    </div>
  );
}
