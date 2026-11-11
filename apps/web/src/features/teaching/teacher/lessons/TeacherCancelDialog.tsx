import { teacherCancelSchema } from '@ab/shared';
import { useId, useState, type SubmitEvent } from 'react';
import { t } from '@/lib/i18n/i18n';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Input } from '@/components/ui/form/input';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Button } from '@/components/ui/form/button';
import { teacherActionError } from './teacher-action-error';
import { useTeacherCancel } from './use-teacher-cancel';

export interface TeacherCancelDialogProps {
  lessonId: string;
  onClose: () => void;
  /** Toast text after the cancel. */
  onDone: (message: string) => void;
}

/**
 * «إلغاء هذه الحلقة» (docs/46 C3, D3): this lesson only, a required reason checked with
 * teacherCancelSchema before the request; the family and the admins hear the reason.
 */
export function TeacherCancelDialog({ lessonId, onClose, onDone }: TeacherCancelDialogProps) {
  const w = t.teacherBoard;
  const formId = useId();
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const cancel = useTeacherCancel(lessonId);
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = teacherCancelSchema.safeParse({ reason });
    setMissing(!parsed.success);
    if (!parsed.success) return;
    cancel.mutate(parsed.data, {
      onSuccess: () => {
        onDone(w.cancelledOk);
        onClose();
      },
    });
  };
  return (
    <Dialog
      title={w.cancelTitle}
      description={w.cancelHint}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {w.keep}
          </Button>
          <Button type="submit" variant="danger" form={formId} disabled={cancel.isPending}>
            {w.cancelSubmit}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-3" onSubmit={submit} noValidate>
        <Field label={w.reason} required error={missing ? w.reasonRequired : undefined}>
          {(p) => (
            <Input
              {...p}
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
        {cancel.isError && <FormAlert>{teacherActionError(cancel.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
