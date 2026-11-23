import { coursePauseErrorCode } from '@ab/client-core';
import type { CoursePauseView } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { useMutation } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { changePauseUntil, useInvalidatePause } from './api';

interface ChangeUntilDialogProps {
  studentId: string;
  pause: Pick<CoursePauseView, 'from_date' | 'until_date'>;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** One date (empty means until resumed), PATCH course-pause/until. */
export function ChangeUntilDialog({ studentId, pause, onClose, onDone }: ChangeUntilDialogProps) {
  const formId = useId();
  const [until, setUntil] = useState(pause.until_date ?? '');
  const today = riyadhToday(); // academy day (docs/34 b): the API's pause days are Riyadh days
  const min = pause.from_date > today ? pause.from_date : today;
  const invalidate = useInvalidatePause(studentId);
  const save = useMutation({
    mutationFn: () => changePauseUntil(studentId, until || null),
    onSuccess: async () => {
      await invalidate();
      onDone(t.coursePause.saved);
    },
  });
  const wrong = until !== '' && until < pause.from_date;
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!wrong) save.mutate();
  };
  return (
    <Dialog
      layout="sheet"
      title={t.coursePause.changeUntilTitle}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={wrong || save.isPending}>
            {t.coursePause.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <Field label={t.coursePause.until} hint={t.coursePause.untilHint} error={wrong ? t.coursePause.errors.invalid_range : undefined}>
          {(p) => <Input {...p} type="date" dir="ltr" min={min} value={until} onChange={(e) => setUntil(e.target.value)} />}
        </Field>
        {save.isError && <FormAlert>{t.coursePause.errors[coursePauseErrorCode(save.error)]}</FormAlert>}
      </form>
    </Dialog>
  );
}
