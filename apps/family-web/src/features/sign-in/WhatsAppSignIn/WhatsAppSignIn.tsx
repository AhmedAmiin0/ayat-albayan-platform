import { CodeStep, t } from '@ab/web-kit';
import { CodeNote } from '@/features/sign-in/CodeNote';
import { PhoneStep } from '@/features/sign-in/PhoneStep';
import { useWhatsAppSignIn } from '@/features/sign-in/use-whatsapp-sign-in';

/**
 * The family pages' default way in: number → code → signed in (docs/50 §4). Each
 * refused code opens the boxes afresh (keyed), so the next try starts in the first one.
 */
export function WhatsAppSignIn() {
  const sign = useWhatsAppSignIn();
  if (sign.flow.target === null) return <PhoneStep sign={sign} />;
  return (
    <CodeStep
      key={sign.refusals}
      flow={sign.flow}
      note={<CodeNote phone={sign.flow.target} />}
      submitLabel={t.familyAuth.verify}
      busyLabel={t.familyAuth.verifying}
      onSubmit={() => void sign.verify(sign.flow.digits)}
      backLabel={t.familyAuth.changePhone}
    />
  );
}
