import type { CodeRoutes } from '@ab/client-core';
import { normalizePhone } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import { codeOf } from '@/features/people/auth/code/code-boxes';
import { CodeStep } from '@/features/people/auth/code/CodeStep';
import { RequestStep } from '@/features/people/auth/code/RequestStep';
import { useCodeFlow } from '@/features/people/auth/code/use-code-flow';
import { signInWithCode } from '@/features/people/auth/sign-in';
import { useLandAfterSignIn } from '@/features/people/auth/use-return-to';

const F = t.familyAuth;

interface Props {
  /** The family's routes or the teacher's (docs/46 A6): the same steps and answers. */
  codes: CodeRoutes;
  /** The words for «codes cannot be sent now» on this tab (the teacher's are not the family's). */
  unavailable?: string;
  /** Links under the phone. */
  children?: ReactNode;
}

/**
 * A WhatsApp number → a 6-digit code → the role's home, or the page the guard carried in
 * `?redirect=` (docs/30 §1, §5; teachers: docs/46 A2).
 */
export function PhoneSignIn({ codes, unavailable, children }: Props) {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  const [phone, setPhone] = useState('');
  const flow = useCodeFlow((e164) => codes.request(e164));

  const send = () => {
    const parsed = normalizePhone(phone);
    if (parsed.ok) void flow.request(parsed.e164);
    else flow.setError(F.errors.invalid_phone);
  };
  const verify = () =>
    flow.guard(async () => {
      const code = codeOf(flow.digits);
      if (code === null || flow.target === null) return F.errors.code_incomplete;
      const result = await signInWithCode({ phone: flow.target, code }, queryClient, codes.verify);
      if (!result.ok) return swapUnavailable(result.error, unavailable);
      await land(result.home);
      return undefined;
    });

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

/** The tab's own «not available» words in place of the family's, when it has some. */
const swapUnavailable = (error: string, unavailable: string | undefined): string =>
  error === F.errors.codes_unavailable ? (unavailable ?? error) : error;
