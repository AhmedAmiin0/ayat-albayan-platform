import { coursePauseErrorCode } from '@ab/client-core';
import { riyadhToday, type CoursePauseView } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { t } from '@/lib/i18n/i18n';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { changePauseUntil, useInvalidatePause } from './api';

interface ChangeUntilDialogProps {
  studentId: string;
  pause: Pick<CoursePauseView, 'from_date' | 'until_date'>;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** «تغيير نهاية الإيقاف»: one date (empty = until «استئناف»), PATCH …/course-pause/until. */
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
