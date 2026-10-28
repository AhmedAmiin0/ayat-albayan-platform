import { coursePauseErrorCode } from '@ab/client-core';
import type { CoursePauseResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { resumeCoursePause, useInvalidatePause } from './api';

interface ResumeCourseDialogProps {
  studentId: string;
  onClose: () => void;
  /** «استُؤنفت الدورة» or, when lessons booked back clash, «… حلقات فيها تعارض تحتاج مراجعة في الجدول: N». */
  onDone: (message: string) => void;
}

/** The toast after a resume. */
const resumedText = (result: Pick<CoursePauseResult, 'conflicts'>): string =>
  result.conflicts > 0 ? t.coursePause.resumedConflicts.replace('{n}', String(result.conflicts)) : t.coursePause.resumed;

/** «استئناف الدورة الآن؟»: POST /students/:id/course-pause/resume after one confirm. */
export function ResumeCourseDialog({ studentId, onClose, onDone }: ResumeCourseDialogProps) {
  const invalidate = useInvalidatePause(studentId);
  const resume = useMutation({
    mutationFn: () => resumeCoursePause(studentId),
    onSuccess: async (result) => {
      await invalidate();
      onDone(resumedText(result));
    },
  });
  return (
    <Dialog
      compact
      title={t.coursePause.resumeTitle}
      description={t.coursePause.resumeBody}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" data-autofocus onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="button" disabled={resume.isPending} onClick={() => resume.mutate()}>
            {t.coursePause.resumeConfirm}
          </Button>
        </>
      }
    >
      {resume.isError ? <FormAlert>{t.coursePause.errors[coursePauseErrorCode(resume.error)]}</FormAlert> : null}
    </Dialog>
  );
}
