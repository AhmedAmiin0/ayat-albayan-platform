import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PasswordInput } from '@/features/people/auth/PasswordInput';
import { t } from '@/lib/i18n/i18n';
import { hasRecoverySession, savePassword, setPasswordError } from './set-password';

const S = t.users.setPassword;
type Phase = 'checking' | 'ready' | 'invalid';

/**
 * /set-password: where the invite / reset link lands. supabase-js reads the recovery session from
 * the URL on load; with one, the user types a new password twice and goes to their home.
 */
export function SetPasswordPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void hasRecoverySession().then((ok) => setPhase(ok ? 'ready' : 'invalid'));
  }, []);

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const problem = setPasswordError(password, confirm);
    setError(problem);
    if (problem) return;
    setBusy(true);
    const result = await savePassword(password, queryClient);
    setBusy(false);
    if (result.ok) await navigate({ to: result.home });
    else setError(result.error);
  };

  return (
    <main className="grid min-h-screen place-items-start justify-items-center bg-page px-4 py-10 sm:place-items-center">
      <form noValidate className="grid w-full max-w-[380px] gap-5" onSubmit={(e) => void submit(e)}>
        <Cartouche>{S.title}</Cartouche>
        {phase === 'checking' && <p className="text-sm text-ink-3">{S.checking}</p>}
        {phase === 'invalid' && <FormAlert>{S.invalid}</FormAlert>}
        {phase === 'ready' && (
          <>
            <p className="text-body text-pretty text-ink-2">{S.intro}</p>
            <Field label={S.password} required>
              {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onValue={setPassword} />}
            </Field>
            <Field label={S.confirm} required error={error}>
              {(p) => <PasswordInput {...p} autoComplete="new-password" value={confirm} onValue={setConfirm} />}
            </Field>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? S.submitting : S.submit}
            </Button>
          </>
        )}
      </form>
    </main>
  );
}
