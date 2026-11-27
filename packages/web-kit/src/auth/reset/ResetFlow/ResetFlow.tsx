import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Field } from '@ab/web-kit/components/ui/form/Field';
import { PasswordInput } from '@ab/web-kit/auth/PasswordInput';
import { CodeStep } from '@ab/web-kit/auth/code/CodeStep';
import { RequestStep } from '@ab/web-kit/auth/code/RequestStep';
import type { Props } from './ResetFlow.types';
import { F } from './reset-flow.helpers';
import { useResetFlow } from './use-reset-flow';

/** One flow for both (docs/30 §6): identifier → code on the registered WhatsApp → new password twice. */
export function ResetFlow({ mode, onDone }: Props) {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    confirm,
    setConfirm,
    flow,
    forgot,
    titleId,
    save,
  } = useResetFlow({ mode, onDone });
  return (
    <section aria-labelledby={titleId} className="grid gap-[22px]">
      <h2 id={titleId} className="font-display text-h3 font-bold text-ink">
        {forgot ? F.forgotTitle : F.firstTime}
      </h2>
      {flow.target === null ? (
        <>
          <p className="text-body text-pretty text-ink-2">
            {forgot ? F.forgotIntro : F.firstTimeIntro}
          </p>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => onDone(false)}
            >
              {F.backToLogin}
            </Button>
          </RequestStep>
        </>
      ) : (
        <CodeStep
          flow={flow}
          submitLabel={F.savePassword}
          busyLabel={F.saving}
          onSubmit={() => void save()}
          backLabel={F.back}
        >
          <Field label={F.newPassword} required>
            {(p) => (
              <PasswordInput
                {...p}
                autoComplete="new-password"
                value={password}
                onValue={setPassword}
              />
            )}
          </Field>
          <Field label={F.confirmPassword} required>
            {(p) => (
              <PasswordInput
                {...p}
                autoComplete="new-password"
                value={confirm}
                onValue={setConfirm}
              />
            )}
          </Field>
        </CodeStep>
      )}
    </section>
  );
}
