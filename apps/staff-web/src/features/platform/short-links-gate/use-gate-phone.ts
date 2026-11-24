import {
  codeStepError, type GateCodeError, type GatePhoneError, type GateStep, phoneStepError,
  resendSecondsLeft,
} from '@ab/client-core';
import type { ShortLinkOpenResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { codeOf, emptyCode } from '@ab/web-kit/auth/code/code-boxes';
import { type PhoneEntry, usePhoneEntry } from '@ab/web-kit/auth/phone/use-phone-entry';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { gateSends } from './gate-api';

/** What the phone or the code step says went wrong (the shortLinks.gate.errors keys). */
export type GateError = GatePhoneError | GateCodeError;

interface Sent {
  /** E.164, as the code went to it. */
  phone: string;
  /** When it was sent (ms), for the resend button. */
  at: number;
}

interface Options {
  code: string;
  onStep: (step: GateStep) => void;
  onResult: (result: ShortLinkOpenResult) => void;
}

export interface GatePhone {
  entry: PhoneEntry;
  /** The number the last code went to, null before one. */
  sentTo: string | null;
  digits: string[];
  setDigits: (digits: string[]) => void;
  error: GateError | null;
  sending: boolean;
  verifying: boolean;
  /** Seconds before resend comes back (0 = now). */
  resendIn: number;
  send: () => void;
  resend: () => void;
  verify: () => void;
  back: () => void;
}

const TICK_MS = 1000;

/**
 * The gate's phone and code steps (boards LinkXGatePhone*, LinkXGateCode*): POST …/otp/start
 * (always 202, so the code step follows), then POST …/otp/verify with the six digits; a failed
 * call says why (client-core phoneStepError / codeStepError).
 */
export function useGatePhone({ code, onStep, onResult }: Options): GatePhone {
  const entry = usePhoneEntry();
  const now = useNow(TICK_MS).getTime();
  const [sent, setSent] = useState<Sent | null>(null);
  const [digits, setDigits] = useState(emptyCode);
  const [error, setError] = useState<GateError | null>(null);
  const start = useMutation({
    mutationFn: gateSends.otpStart,
    onMutate: () => setError(null),
    onSuccess: (_, call) => {
      setSent({ phone: call.phone, at: Date.now() });
      setDigits(emptyCode());
      onStep('code');
    },
    onError: (e) => setError(phoneStepError(e)),
  });
  const check = useMutation({
    mutationFn: gateSends.otpVerify,
    onMutate: () => setError(null),
    onSuccess: onResult,
    onError: (e) => setError(codeStepError(e)),
  });
  const sendTo = (phone: string | null) => {
    if (phone === null) {
      setError('invalid_phone');
      return;
    }
    start.mutate({ code, phone });
  };
  const verify = () => {
    const otp = codeOf(digits);
    if (otp === null || sent === null) {
      setError('code_incomplete');
      return;
    }
    check.mutate({ code, phone: sent.phone, otp });
  };
  return {
    entry, sentTo: sent?.phone ?? null, digits, setDigits, error,
    sending: start.isPending, verifying: check.isPending,
    resendIn: sent ? resendSecondsLeft(sent.at, now) : 0,
    send: () => sendTo(entry.check.e164),
    resend: () => sendTo(sent?.phone ?? null),
    verify,
    back: () => {
      setError(null);
      onStep('phone');
    },
  };
}
