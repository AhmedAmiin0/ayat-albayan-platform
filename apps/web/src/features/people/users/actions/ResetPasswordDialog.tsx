import type { CredentialMode, IssuedCredential, UserDetail } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { resetPassword } from '../api';
import { CredentialPicker } from '../create/CredentialPicker';
import { CredentialResult } from '../create/CredentialResult';
import { userErrorText } from '../errors';
import { passwordError } from '../validation';

const R = t.users.reset;

export interface ResetPasswordDialogProps {
  user: UserDetail;
  onBack: () => void;
  onClose: () => void;
}

/** «إعادة تعيين كلمة السر»: typed, generated or an invite link; a generated one is shown once. */
export function ResetPasswordDialog({ user, onBack, onClose }: ResetPasswordDialogProps) {
  const formId = useId();
  const [mode, setMode] = useState<CredentialMode>('generate');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [issued, setIssued] = useState<{ credential: IssuedCredential | null } | null>(null);
  const reset = useMutation({ mutationFn: resetPassword, gcTime: 0, onSuccess: (r) => setIssued({ credential: r.credential }) });
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const problem = mode === 'set' ? passwordError(password) : undefined;
    setError(problem);
    if (!problem) reset.mutate({ id: user.id, body: mode === 'set' ? { credential: mode, password } : { credential: mode } });
  };
  if (issued) return <CredentialResult title={t.users.result.resetTitle} credential={issued.credential} onClose={onClose} />;
  return (
    <Dialog
      title={R.title}
      description={user.full_name}
      onClose={onBack}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onBack}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={reset.isPending}>
            {R.confirm}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <CredentialPicker name="reset-credential" mode={mode} password={password} error={error} onMode={setMode} onPassword={setPassword} />
        <p className="text-xs text-pretty text-ink-3">{R.hint}</p>
        {reset.error && <FormAlert>{userErrorText(reset.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
