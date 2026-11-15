import { useState } from 'react';
import { signInErrorText } from '@/features/people/auth/login/auth-api';
import { emptyCode } from './code-boxes';
import { useCountdown } from './use-countdown';

/** A step's outcome: undefined = done, a string = the error to show. */
type Task = () => Promise<string | undefined>;

/**
 * «أرسل الرمز» then the code (docs/30 §7), shared by the family phone sign-in and the password reset.
 * `target` is what the code was sent for (null = still asking for it). The API answers 202 whether or
 * not the account exists, so the code step always follows a request that did not fail.
 */
export function useCodeFlow(send: (target: string) => Promise<void>) {
  const [target, setTarget] = useState<string | null>(null);
  const [digits, setDigits] = useState(emptyCode);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
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
  const back = () => {
    setTarget(null);
    setError(undefined);
  };
  return { target, digits, setDigits, error, setError, busy, left: countdown.left, guard, request, back };
}

export type CodeFlow = ReturnType<typeof useCodeFlow>;
