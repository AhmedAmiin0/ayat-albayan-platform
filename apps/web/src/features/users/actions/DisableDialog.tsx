import type { UserDetail } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { disableUser, USERS_KEY } from '../api';
import { userErrorText } from '../errors';

const D = t.users.disable;

export interface DisableDialogProps {
  user: UserDetail;
  onBack: () => void;
  onDone: (message: string) => void;
}

/** «تعطيل الحساب» with an optional reason: the user can no longer sign in, nothing is deleted. */
export function DisableDialog({ user, onBack, onDone }: DisableDialogProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [reason, setReason] = useState('');
  const disable = useMutation({
    mutationFn: disableUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
      onDone(t.users.toast.disabled);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    disable.mutate({ id: user.id, reason: reason.trim() });
  };
  return (
    <Dialog
      title={D.title}
      description={user.full_name}
      onClose={onBack}
      compact
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onBack}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} variant="danger" disabled={disable.isPending}>
            {D.confirm}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-3" onSubmit={submit} noValidate>
        <Field label={D.reason} hint={D.hint}>
          {(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {disable.error && <FormAlert>{userErrorText(disable.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
