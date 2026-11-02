import type { UserDetail } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { disableUser, USERS_KEY } from '@/users/shared/api';
import { userErrorText } from '@/users/shared/errors';
import { PanelButtons } from './PanelButtons';
import { TextField } from '@/users/shared/TextField';

interface DisablePanelProps {
  user: UserDetail;
  onBack: () => void;
  onDone: (message: string) => void;
}

/** «تعطيل الحساب» with an optional reason: the user can no longer sign in, nothing is deleted. */
export function DisablePanel({ user, onBack, onDone }: DisablePanelProps) {
  const D = t.users.disable;
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const disable = useMutation({
    mutationFn: disableUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
      onDone(t.users.toast.disabled);
    },
  });
  return (
    <Section title={D.title}>
      <TextField label={D.reason} value={reason} onChangeText={setReason} />
      <Note>{D.hint}</Note>
      {disable.error ? <ErrorLine message={userErrorText(disable.error)} /> : null}
      <PanelButtons
        confirmLabel={D.confirm}
        busy={disable.isPending}
        onConfirm={() => disable.mutate({ id: user.id, reason: reason.trim() })}
        onCancel={onBack}
      />
    </Section>
  );
}
