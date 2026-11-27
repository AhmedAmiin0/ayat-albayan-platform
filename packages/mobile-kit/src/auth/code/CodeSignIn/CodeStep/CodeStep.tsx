import { t } from '../../../../lib/i18n/i18n';
import { Button } from '../../../../ui/primitives/Button';
import { AuthAlert } from '../../../forgot/AuthAlert';
import { CodeField } from '../../../forgot/CodeField';
import { ResendButton } from '../../../forgot/ResendButton';
import type { CodeStepProps } from '../CodeSignIn.types';
import { useCodeStep } from './use-code-step';

export function CodeStep({ flow, target }: CodeStepProps) {
  const { code, setCode, verifyLabel, verify, resend } = useCodeStep({ flow, target });
  return (
    <>
      <AuthAlert tone="ok" text={t.familyAuth.codeSent} />
      <CodeField value={code} onChange={setCode} />
      {flow.error ? <AuthAlert text={flow.error} /> : null}
      <Button label={verifyLabel} busy={flow.busy} onPress={verify} />
      <ResendButton resendIn={flow.resendIn} busy={flow.busy} onPress={resend} />
      <Button variant="ghost" label={t.familyAuth.changePhone} onPress={flow.changePhone} />
    </>
  );
}
