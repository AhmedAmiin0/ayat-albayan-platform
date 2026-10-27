import { normalizePhone } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import { codeOf } from '../code/code-boxes';
import { CodeStep } from '../code/CodeStep';
import { RequestStep } from '../code/RequestStep';
import { useCodeFlow } from '../code/use-code-flow';
import { authApi } from '../login/auth-api';
import { signInWithCode } from '../sign-in';

const F = t.familyAuth;

/** The guardian's WhatsApp number → a 6-digit code → their home (docs/30 §1, §5). `children`: links under the phone. */
export function PhoneSignIn({ children }: { children?: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const flow = useCodeFlow((e164) => authApi.requestCode(e164));

  const send = () => {
    const parsed = normalizePhone(phone);
    if (parsed.ok) void flow.request(parsed.e164);
    else flow.setError(F.errors.invalid_phone);
  };
  const verify = () =>
    flow.guard(async () => {
      const code = codeOf(flow.digits);
      if (code === null || flow.target === null) return F.errors.code_incomplete;
      const result = await signInWithCode({ phone: flow.target, code }, queryClient);
      if (!result.ok) return result.error;
      await navigate({ to: result.home });
      return undefined;
    });

  if (flow.target === null) {
    return (
      <RequestStep label={F.phone} hint={F.phoneHint} kind="tel" value={phone} onValue={setPhone}
        onSubmit={send} busy={flow.busy} error={flow.error}>
        {children}
      </RequestStep>
    );
  }
  return (
    <CodeStep flow={flow} submitLabel={F.verify} busyLabel={F.verifying} onSubmit={() => void verify()} backLabel={F.changePhone} />
  );
}
