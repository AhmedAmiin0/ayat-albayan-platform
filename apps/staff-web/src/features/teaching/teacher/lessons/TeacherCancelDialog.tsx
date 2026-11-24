import { teacherCancelSchema } from '@ab/schedule';
import { useId, useState, type SubmitEvent } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { teacherActionError } from './teacher-action-error';
import { useTeacherCancel } from './use-teacher-cancel';

export interface TeacherCancelDialogProps {
  lessonId: string;
  /** teacherCanPropose: open with no pending proposal (else the API answers 409). */
  canPropose: boolean;
  /** Proposing a new time instead closes this dialog and opens the proposal. */
  onPropose: () => void;
  onClose: () => void;
  /** Toast text after the cancel. */
  onDone: (message: string) => void;
}

/** Cancels this lesson only with a required reason; the API refuses proposals once cancelled. */
export function TeacherCancelDialog(props: TeacherCancelDialogProps) {
  const { lessonId, canPropose, onPropose, onClose, onDone } = props;
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
        <CancelActions {...{ canPropose, onPropose, onClose, formId }} busy={cancel.isPending} />
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

interface CancelActionsProps {
  canPropose: boolean;
  onPropose: () => void;
  onClose: () => void;
  formId: string;
  busy: boolean;
}

function CancelActions({ canPropose, onPropose, onClose, formId, busy }: CancelActionsProps) {
  const w = t.teacherBoard;
  return (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {w.keep}
      </Button>
      {canPropose && (
        <Button type="button" variant="secondary" onClick={onPropose}>
          {w.suggestOther}
        </Button>
      )}
      <Button type="submit" variant="danger" form={formId} disabled={busy}>
        {w.cancelSubmit}
      </Button>
    </>
  );
}
