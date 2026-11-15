import { CodeStep } from '@ab/web-kit/auth/code/CodeStep';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PhoneStep } from './PhoneStep';
import { useWhatsAppSignIn } from './use-whatsapp-sign-in';

/** The family pages' default way in: number → code → signed in (docs/50 §4, owner 11-15). */
export function WhatsAppSignIn() {
  const sign = useWhatsAppSignIn();
  if (sign.flow.target === null) return <PhoneStep sign={sign} />;
  return (
    <CodeStep
      flow={sign.flow}
      submitLabel={t.familyAuth.verify}
      busyLabel={t.familyAuth.verifying}
      onSubmit={() => void sign.verify()}
      backLabel={t.familyAuth.changePhone}
    />
  );
}
