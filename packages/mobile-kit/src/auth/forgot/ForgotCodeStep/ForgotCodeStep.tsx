import { t } from '../../../lib/i18n/i18n';
import { Button } from '../../../ui/primitives/Button';
import { Field } from '../../../ui/form/Field';
import { AuthAlert } from '../AuthAlert';
import { CodeField } from '../CodeField';
import { ResendButton } from '../ResendButton';
import type { ForgotCodeStepProps } from './ForgotCodeStep.types';
import { useForgotCodeStep } from './use-forgot-code-step';

/** The WhatsApp code + the new password twice; resend comes back after RESEND_SECONDS. */
export function ForgotCodeStep({ forgot }: ForgotCodeStepProps) {
  const { code, setCode, password, setPassword, confirm, setConfirm, busy, resendIn } =
    useForgotCodeStep({ forgot });
  return (
    <>
      <AuthAlert tone="ok" text={t.familyAuth.codeSent} />
      <CodeField value={code} onChange={setCode} />
      <Field
        label={t.familyAuth.newPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <Field
        label={t.familyAuth.confirmPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        value={confirm}
        onChangeText={setConfirm}
      />
      {forgot.error ? <AuthAlert text={forgot.error} /> : null}
      <Button
        label={busy ? t.familyAuth.saving : t.familyAuth.savePassword}
        busy={busy}
        onPress={() => void forgot.reset({ code, password, confirm })}
      />
      <ResendButton resendIn={resendIn} busy={busy} onPress={() => void forgot.send()} />
    </>
  );
}
