import { Button, FormAlert, t } from '@ab/web-kit';
import { errorCode, lessonErrorText } from '@/features/teaching/schedule';
import { useSalesConfirmLesson } from './sales-confirm-api';

/** The confirm's own wording for lesson_ended and invalid_transition; the lessons wording otherwise. */
export function confirmErrorText(error: unknown): string {
  const code = errorCode(error);
  if (code === 'lesson_ended') return t.sales.lessonActions.confirmEnded;
  if (code === 'invalid_transition') return t.sales.lessonActions.confirmInvalid;
  return lessonErrorText(error);
}

interface SalesConfirmLessonProps {
  lessonId: string;
  /** The drawer shows the lesson confirmed while the day re-reads. */
  onConfirmed: () => void;
  /** Under a live join button it is outlined, so the drawer keeps one filled button. */
  secondary?: boolean;
}

/** Any lesson (all assistants see the family's reply), scheduled to confirmed, no message sent. */
export function SalesConfirmLesson({
  lessonId,
  onConfirmed,
  secondary = false,
}: SalesConfirmLessonProps) {
  const confirm = useSalesConfirmLesson(lessonId, onConfirmed);
  return (
    <div className="grid gap-2">
      {confirm.isError && <FormAlert>{confirmErrorText(confirm.error)}</FormAlert>}
      <Button type="button" variant={secondary ? 'secondary' : 'primary'} disabled={confirm.isPending} onClick={() => confirm.mutate()}>
        {confirm.isPending ? t.common.saving : t.sales.lessonActions.confirm}
      </Button>
    </div>
  );
}
