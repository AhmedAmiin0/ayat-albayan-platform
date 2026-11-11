import { confirmedChipShown, confirmedNow, teacherCanAct } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { teacherActionError } from './teacher-action-error';
import { useTeacherConfirm } from './use-teacher-confirm';

export interface TeacherConfirmProps {
  lesson: LessonView;
  now: Date;
  onDone: (message: string) => void;
}

/**
 * «سأحضر» (docs/46 C4, D1) while the lesson is open and ahead; once she said so (the re-read
 * lesson's teacher_confirmed_at, or the confirm's answer until it arrives), «حضورك مؤكَّد»
 * instead, only while the lesson is still ahead (as on the phone). Never the family «تأكيد».
 */
export function TeacherConfirm({ lesson, now, onDone }: TeacherConfirmProps) {
  const w = t.teacherBoard;
  const confirm = useTeacherConfirm(lesson.id);
  const answer = confirm.data;
  const chip = confirmedChipShown(lesson, { answer, now });
  const offered = teacherCanAct(lesson, now) && !confirmedNow(lesson, answer);
  return (
    <>
      {confirm.isError && <FormAlert>{teacherActionError(confirm.error)}</FormAlert>}
      {chip && (
        <StatusChip tone="ok" glyph="fill" label={w.confirmedChip} className="justify-self-start" />
      )}
      {offered && (
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={confirm.isPending}
          onClick={() => confirm.mutate(undefined, { onSuccess: () => onDone(w.confirmedOk) })}
        >
          {w.confirm}
        </Button>
      )}
    </>
  );
}
