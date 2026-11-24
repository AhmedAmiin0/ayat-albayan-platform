import type { LessonView } from '@ab/schedule';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherActionError } from './teacher-action-error';
import { useConfirmError, useTeacherConfirm } from './use-teacher-confirm';

export interface TeacherConfirmProps {
  lesson: LessonView;
  /** primary when it leads (docs/48 lessonPlan), secondary as a peer or on a list row. */
  variant: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  onDone: (message: string) => void;
}

/** Optimistic confirm (docs/46 C4, docs/48); a 409 lesson_started refusal restores the button. */
export function TeacherConfirm({ lesson, variant, size = 'lg', onDone }: TeacherConfirmProps) {
  const w = t.teacherBoard;
  const confirm = useTeacherConfirm(lesson.id, () => onDone(w.confirmedOk));
  const error = useConfirmError(lesson.id);
  return (
    <div className="grid gap-2">
      {error !== null && <FormAlert>{teacherActionError(error)}</FormAlert>}
      <Button
        type="button"
        variant={variant}
        size={size}
        className="w-full"
        disabled={confirm.isPending}
        onClick={() => confirm.mutate()}
      >
        {w.confirm}
      </Button>
    </div>
  );
}
