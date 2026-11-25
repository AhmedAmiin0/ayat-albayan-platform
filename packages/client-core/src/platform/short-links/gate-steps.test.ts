import { describe, expect, it } from 'vitest';
import { RESEND_SECONDS } from '../../core/auth';
import { ApiError } from '../../core/http';
import { canResend } from '../..';
import { codeStepError, phoneStepError, resendSecondsLeft } from './gate-steps';

describe('phone step errors', () => {
  it('maps the API answers to keys', () => {
    expect(phoneStepError(new ApiError(400, { message: 'validation_failed' }))).toBe(
      'invalid_phone',
    );
    expect(phoneStepError(new ApiError(429, { code: 'too_many_requests' }))).toBe(
      'too_many_requests',
    );
    expect(phoneStepError(new ApiError(409, { code: 'codes_unavailable' }))).toBe(
      'codes_unavailable',
    );
    expect(phoneStepError(new ApiError(503))).toBe('codes_unavailable');
    expect(phoneStepError(new TypeError('offline'))).toBe('generic');
  });
});

describe('code step errors', () => {
  it('maps the API answers to keys', () => {
    expect(codeStepError(new ApiError(401, { code: 'invalid_code' }))).toBe('invalid_code');
    expect(codeStepError(new ApiError(400))).toBe('invalid_code');
    expect(codeStepError(new ApiError(429))).toBe('too_many_requests');
    expect(codeStepError(new ApiError(500))).toBe('generic');
    expect(codeStepError(null)).toBe('generic');
  });
});

describe('resend countdown', () => {
  const sentAt = Date.parse('2026-11-18T10:00:00Z');
  it('counts the family sign-in seconds down to zero', () => {
    expect(resendSecondsLeft(sentAt, sentAt)).toBe(RESEND_SECONDS);
    expect(resendSecondsLeft(sentAt, sentAt + 18_000)).toBe(RESEND_SECONDS - 18);
    expect(resendSecondsLeft(sentAt, sentAt + 18_400)).toBe(RESEND_SECONDS - 18);
    expect(resendSecondsLeft(sentAt, sentAt + RESEND_SECONDS * 1000)).toBe(0);
    expect(resendSecondsLeft(sentAt, sentAt + 999_999)).toBe(0);
  });

  it('never exceeds the full wait when the clock goes back', () => {
    expect(resendSecondsLeft(sentAt, sentAt - 5000)).toBe(RESEND_SECONDS);
  });

  it('allows a resend once the wait is over (with the sign-in’s canResend)', () => {
    const at = (now: number) => canResend({ left: resendSecondsLeft(sentAt, now), busy: false });
    expect(at(sentAt + 1000)).toBe(false);
    expect(at(sentAt + RESEND_SECONDS * 1000)).toBe(true);
  });
});
