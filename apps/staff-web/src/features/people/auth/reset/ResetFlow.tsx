import { useId, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { t } from '@/lib/i18n/i18n';
import { PasswordInput } from '@/features/people/auth/PasswordInput';
import { codeOf } from '@/features/people/auth/code/code-boxes';
import { CodeStep } from '@/features/people/auth/code/CodeStep';
import { RequestStep } from '@/features/people/auth/code/RequestStep';
import { useCodeFlow } from '@/features/people/auth/code/use-code-flow';
import { authApi } from '@/features/people/auth/login/auth-api';
import { newPasswordProblem } from './reset-checks';

const F = t.familyAuth;

interface Props {
  /** forgot = «نسيت كلمة المرور؟» (any identifier); firstTime = «أول دخول؟» (a child's student code). */
  mode: 'forgot' | 'firstTime';
  /** `saved`: the password was saved (the caller says so and shows the sign-in form). */
  onDone: (saved: boolean) => void;
}

/** One flow for both (docs/30 §6): identifier → code on the registered WhatsApp → new password twice. */
export function ResetFlow({ mode, onDone }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const flow = useCodeFlow((value) => authApi.forgot({ identifier: value }));
  const forgot = mode === 'forgot';
  const titleId = useId();

  const save = () =>
    flow.guard(async () => {
      const code = codeOf(flow.digits);
      if (code === null || flow.target === null) return F.errors.code_incomplete;
      const problem = newPasswordProblem(password, confirm);
      if (problem) return problem;
      await authApi.reset({ identifier: flow.target, code, password });
      onDone(true);
      return undefined;
    });

  return (
    <section aria-labelledby={titleId} className="grid gap-[22px]">
      <h2 id={titleId} className="font-display text-h3 font-bold text-ink">
        {forgot ? F.forgotTitle : F.firstTime}
      </h2>
      {flow.target === null ? (
        <>
          <p className="text-body text-pretty text-ink-2">{forgot ? F.forgotIntro : F.firstTimeIntro}</p>
          <RequestStep
            label={forgot ? F.identifier : F.username}
            hint={forgot ? undefined : F.studentUsernameHint}
            kind="username"
            value={identifier}
            onValue={setIdentifier}
            onSubmit={() => void flow.request(identifier.trim())}
            busy={flow.busy}
            error={flow.error}
          >
            <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => onDone(false)}>
              {F.backToLogin}
            </Button>
          </RequestStep>
        </>
      ) : (
        <CodeStep flow={flow} submitLabel={F.savePassword} busyLabel={F.saving} onSubmit={() => void save()} backLabel={F.back}>
          <Field label={F.newPassword} required>
            {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onValue={setPassword} />}
          </Field>
          <Field label={F.confirmPassword} required>
            {(p) => <PasswordInput {...p} autoComplete="new-password" value={confirm} onValue={setConfirm} />}
          </Field>
        </CodeStep>
      )}
    </section>
  );
}
