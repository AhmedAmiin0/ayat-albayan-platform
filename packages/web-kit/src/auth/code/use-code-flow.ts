import { canResend } from '@ab/client-core';
import { useState } from 'react';
import { signInErrorText } from '@ab/web-kit/auth/login/auth-api';
import { emptyCode } from './code-boxes';
import { useCountdown } from './use-countdown';

/** A step's outcome: undefined = done, a string = the error to show. */
type Task = () => Promise<string | undefined>;

/** docs/30 §7: the API answers 202 whether or not the account exists. */
export function useCodeFlow(send: (target: string) => Promise<void>) {
  const [target, setTarget] = useState<string | null>(null);
  const [digits, setDigits] = useState(emptyCode);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  // A resend is busy too, but the submit keeps its own word (it is not verifying).
  const [resending, setResending] = useState(false);
  const countdown = useCountdown();

  const guard = async (task: Task): Promise<void> => {
    setBusy(true);
    setError(undefined);
    const problem = await task().catch(signInErrorText);
    setBusy(false);
    setError(problem);
  };
  const request = (value: string) =>
    guard(async () => {
      await send(value);
      setTarget(value);
      setDigits(emptyCode());
      countdown.restart();
      return undefined;
    });
  // As the family app: the same target again, the digits typed meanwhile stay.
  const resend = async (): Promise<void> => {
    if (target === null || !canResend({ left: countdown.left, busy })) return;
    setResending(true);
    await guard(async () => {
      await send(target);
      countdown.restart();
      return undefined;
    });
    setResending(false);
  };
  const back = () => {
    setTarget(null);
    setError(undefined);
  };
  const left = countdown.left;
  return {
    target, digits, setDigits, error, setError, busy, resending, left, guard, request, resend, back,
  };
}

export type CodeFlow = ReturnType<typeof useCodeFlow>;
