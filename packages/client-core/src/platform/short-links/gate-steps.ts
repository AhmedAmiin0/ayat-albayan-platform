import { RESEND_SECONDS } from '../../core/auth';
import { ApiError, apiErrorCode } from '../../core/http';

// Resend timing reuses the family sign-in's RESEND_SECONDS.

export const GATE_PHONE_ERRORS = [
  'invalid_phone',
  'too_many_requests',
  'codes_unavailable',
  'generic',
] as const;
export type GatePhoneError = (typeof GATE_PHONE_ERRORS)[number];

export const GATE_CODE_ERRORS = [
  'invalid_code',
  'code_incomplete',
  'too_many_requests',
  'generic',
] as const;
export type GateCodeError = (typeof GATE_CODE_ERRORS)[number];

const statusOf = (e: unknown): number => (e instanceof ApiError ? e.status : 0);

const PHONE_BY_STATUS: Readonly<Record<number, GatePhoneError>> = {
  400: 'invalid_phone',
  429: 'too_many_requests',
  503: 'codes_unavailable',
};

const CODE_BY_STATUS: Readonly<Record<number, GateCodeError>> = {
  400: 'invalid_code',
  401: 'invalid_code',
  429: 'too_many_requests',
};

export function phoneStepError(e: unknown): GatePhoneError {
  const byCode = apiErrorCode(e) === 'codes_unavailable' ? 'codes_unavailable' : undefined;
  return byCode ?? PHONE_BY_STATUS[statusOf(e)] ?? 'generic';
}

/** POST …/otp/verify failed: invalid_code (401), too_many_requests (429), else generic. */
export function codeStepError(e: unknown): GateCodeError {
  return CODE_BY_STATUS[statusOf(e)] ?? 'generic';
}

/** 0 means resend shows now; enabling uses the family sign-in's canResend to avoid a name clash. */
export function resendSecondsLeft(sentAt: number, now: number): number {
  const left = Math.ceil(RESEND_SECONDS - (now - sentAt) / 1000);
  return Math.min(RESEND_SECONDS, Math.max(0, left));
}
