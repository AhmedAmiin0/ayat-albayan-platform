import type { CredentialMode, IssuedCredential, UserDetail } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { resetPassword } from './api';
import { CredentialPicker } from './CredentialPicker';
import { CredentialResult } from './CredentialResult';
import { userErrorText } from './errors';
import { PanelButtons } from './PanelButtons';
import { passwordError } from './validation';

export interface ResetPasswordPanelProps {
  user: UserDetail;
  onBack: () => void;
}

/** «إعادة تعيين كلمة السر»: typed, generated or an invite link; a generated one is shown once. */
export function ResetPasswordPanel({ user, onBack }: ResetPasswordPanelProps) {
  const R = t.users.reset;
  const [mode, setMode] = useState<CredentialMode>('generate');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  // Only here: no query or storage ever holds the credential.
  const [issued, setIssued] = useState<{ credential: IssuedCredential | null } | null>(null);
  const reset = useMutation({ mutationFn: resetPassword, gcTime: 0, onSuccess: (r) => setIssued({ credential: r.credential }) });
  const submit = () => {
    const problem = mode === 'set' ? passwordError(password) : undefined;
    setError(problem);
    if (!problem) reset.mutate({ id: user.id, body: mode === 'set' ? { credential: mode, password } : { credential: mode } });
  };
  if (issued) return <CredentialResult title={t.users.result.resetTitle} credential={issued.credential} onClose={onBack} />;
  return (
    <Section title={R.title}>
      <CredentialPicker mode={mode} password={password} error={error} onMode={setMode} onPassword={setPassword} />
      <Note>{R.hint}</Note>
      {reset.error ? <ErrorLine message={userErrorText(reset.error)} /> : null}
      <PanelButtons confirmLabel={R.confirm} busy={reset.isPending} onConfirm={submit} onCancel={onBack} />
    </Section>
  );
}
