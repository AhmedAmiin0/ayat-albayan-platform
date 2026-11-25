import { coursePauseErrorCode } from '@ab/client-core';
import type { CoursePauseResult } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, FormAlert, Dialog, t, useViewerTz } from '@ab/web-kit';
import { resumeCoursePause, resumePreviewQuery, useInvalidatePause } from './api';
import { resumeLines } from './pause-form';

interface ResumeCourseDialogProps {
  studentId: string;
  /** A package row's resume; absent from the banner means the open pause. */
  subscriptionId?: string;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** The toast after a resume. */
const resumedText = (result: Pick<CoursePauseResult, 'conflicts'>): string =>
  result.conflicts > 0 ? t.coursePause.resumedConflicts.replace('{n}', String(result.conflicts)) : t.coursePause.resumed;

/** POST /students/:id/course-pause/resume after one confirm. */
export function ResumeCourseDialog({
  studentId,
  subscriptionId,
  onClose,
  onDone,
}: ResumeCourseDialogProps) {
  const invalidate = useInvalidatePause(studentId);
  const tz = useViewerTz();
  const preview = useQuery(resumePreviewQuery(studentId));
  const resume = useMutation({
    mutationFn: () => resumeCoursePause(studentId, subscriptionId),
    onSuccess: async (result) => {
      await invalidate();
      onDone(resumedText(result));
    },
  });
  return (
    <Dialog
      compact
      title={t.coursePause.resumeTitle}
      description={preview.data ? resumeLines(preview.data, tz).join(' · ') : t.coursePause.resumeBody}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" data-autofocus onClick={onClose}>
            {t.common.back}
          </Button>
          <Button type="button" disabled={resume.isPending} onClick={() => resume.mutate()}>
            {t.coursePause.resumeConfirm}
          </Button>
        </>
      }
    >
      {resume.isError ? (
        <FormAlert>{t.coursePause.errors[coursePauseErrorCode(resume.error)]}</FormAlert>
      ) : null}
    </Dialog>
  );
}
