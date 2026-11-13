import type { LessonView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { teacherActionError } from './teacher-action-error';
import { useConfirmError, useTeacherConfirm } from './use-teacher-confirm';

export interface TeacherConfirmProps {
  lesson: LessonView;
  /** primary when it leads (docs/48 lessonPlan), secondary as a peer or on a list row. */
  variant: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  onDone: (message: string) => void;
}

/**
 * «سأحضر» (docs/46 C4, D1). The caller shows it only while teacherCanConfirm holds; the confirm is
 * optimistic (docs/48), so the word flips to «حضورك مؤكَّد» from the cache at once, and a refusal
 * (409 lesson_started) puts the button back with the reason. Never the family «تأكيد».
 */
export function TeacherConfirm({ lesson, variant, size = 'lg', onDone }: TeacherConfirmProps) {
  const w = t.teacherBoard;
  const confirm = useTeacherConfirm(lesson.id, () => onDone(w.confirmedOk));
  const error = useConfirmError(lesson.id);
  return (
    <>
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
    </>
  );
}
