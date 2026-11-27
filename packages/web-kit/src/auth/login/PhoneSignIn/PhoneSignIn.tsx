import { CodeStep } from '@ab/web-kit/auth/code/CodeStep';
import { RequestStep } from '@ab/web-kit/auth/code/RequestStep';
import type { Props } from './PhoneSignIn.types';
import { F } from './phone-sign-in.helpers';
import { usePhoneSignIn } from './use-phone-sign-in';

/**
 * A WhatsApp number → a 6-digit code → the role's home, or the page the guard carried in
 * `?redirect=` (docs/30 §1, §5; teachers: docs/46 A2).
 */
export function PhoneSignIn({ codes, unavailable, children }: Props) {
  const { phone, setPhone, flow, send, verify } = usePhoneSignIn({ codes, unavailable });
  if (flow.target === null) {
    return (
      <RequestStep
        label={F.phone}
        hint={F.phoneHint}
        kind="tel"
        value={phone}
        onValue={setPhone}
        onSubmit={send}
        busy={flow.busy}
        error={flow.error}
      >
        {children}
      </RequestStep>
    );
  }
  return (
    <CodeStep
      flow={flow}
      submitLabel={F.verify}
      busyLabel={F.verifying}
      onSubmit={() => void verify()}
      backLabel={F.changePhone}
    />
  );
}
