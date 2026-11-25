import { describe, expect, it } from 'vitest';
import { RESEND_SECONDS } from '../../core/auth';
import { CODE_STEP_ACTIONS, canResend, countdownTick, resendLabel } from './resend';

const words = { resend: 'أعد إرسال الرمز', resendIn: 'يمكنك إعادة الإرسال بعد {seconds} ث' };

describe('code step resend rules', () => {
  it('orders resend before «غيّر الرقم»', () => {
    expect(CODE_STEP_ACTIONS).toEqual(['resend', 'back']);
  });

  it('waits a minute after each sent code', () => {
    expect(RESEND_SECONDS).toBe(60);
  });

  it('counts the seconds down in the label, then offers the resend', () => {
    expect(resendLabel(60, words)).toBe('يمكنك إعادة الإرسال بعد 60 ث');
    expect(resendLabel(1, words)).toBe('يمكنك إعادة الإرسال بعد 1 ث');
    expect(resendLabel(0, words)).toBe(words.resend);
  });

  it('allows a resend only once the countdown is over and nothing is in flight', () => {
    expect(canResend({ left: 0, busy: false })).toBe(true);
    expect(canResend({ left: 5, busy: false })).toBe(false);
    expect(canResend({ left: 0, busy: true })).toBe(false);
    expect(canResend({ left: 5, busy: true })).toBe(false);
  });

  it('ticks one second at a time and stops at zero', () => {
    expect(countdownTick(60)).toBe(59);
    expect(countdownTick(1)).toBe(0);
    expect(countdownTick(0)).toBe(0);
  });
});
