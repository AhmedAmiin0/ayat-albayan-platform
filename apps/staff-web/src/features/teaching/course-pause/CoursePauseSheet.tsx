import { coursePauseErrorCode } from '@ab/client-core';
import { riyadhToday } from '@ab/time';
import { useMutation } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { startCoursePause, useInvalidatePause } from './api';
import { draftOn, draftProblem, startBody, type PauseDraft } from './pause-form';
import { PauseFields } from './PauseFields';

interface CoursePauseSheetProps {
  studentId: string;
  onClose: () => void;
  /** After the pause is saved and the student's queries re-read: the caller shows t.coursePause.done. */
  onDone: (message: string) => void;
}

/** From defaults to Riyadh today; empty until means until resumed; no WhatsApp is sent. */
export function CoursePauseSheet({ studentId, onClose, onDone }: CoursePauseSheetProps) {
  const formId = useId();
  const today = riyadhToday(); // academy day (docs/34 b): the API's pause days are Riyadh days
  const [draft, setDraft] = useState<PauseDraft>(() => draftOn(today));
  const invalidate = useInvalidatePause(studentId);
  const start = useMutation({
    mutationFn: () => startCoursePause(studentId, startBody(draft)),
    onSuccess: async () => {
      await invalidate();
      onDone(t.coursePause.done);
    },
  });
  const blocked = draftProblem(draft, today) !== null;
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!blocked) start.mutate();
  };
  return (
    <Dialog
      layout="sheet"
      title={t.coursePause.title}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={blocked || start.isPending}>
            {start.isPending ? t.common.saving : t.coursePause.confirm}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <PauseFields
          studentId={studentId}
          today={today}
          draft={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        />
        {start.isError && (
          <FormAlert>{t.coursePause.errors[coursePauseErrorCode(start.error)]}</FormAlert>
        )}
      </form>
    </Dialog>
  );
}
