import { describe, expect, it } from 'vitest';
import { failurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { isWindowClosedError } from './window-rules';

// Rule 5 (owner 2026-11-03): WhatsApp's window refusal is window_closed and never retried.
// Fakes only: never Kapso, never Meta.

const NOW = new Date('2026-11-03T08:00:00Z');
const KAPSO_BODY =
  '{"error":"Cannot send non-template messages outside the 24-hour window.",' +
  '"next_steps":"Send a WhatsApp template message to reopen the session."}';
const kapso422 = new WaError('WhatsApp HTTP 422', { code: null, status: 422, details: KAPSO_BODY });
const meta = (code: number) => new WaError('(#x) Re-engagement message', { code, status: 400 });

describe('the window refusal', () => {
  it.each([
    ['Kapso 422 «outside the 24-hour window»', kapso422],
    ['Meta 131047', meta(131047)],
    ['Meta 470', meta(470)],
  ])('%s is window_closed and fails at once, on the first try', (_name, error) => {
    expect(isWindowClosedError(error)).toBe(true);
    expect(failurePlan({ error, attempts: 1, now: NOW })).toMatchObject({
      status: 'failed',
      next_attempt_at: null,
      error_code: 'window_closed',
    });
  });

  it('another Kapso 422, a 500 or a bug is not the window (the usual retry stands)', () => {
    const other = new WaError('WhatsApp HTTP 422', {
      code: null,
      status: 422,
      details: '{"error":"bad"}',
    });
    const outage = new WaError('WhatsApp HTTP 500', { code: null, status: 500 });
    for (const error of [other, outage, new Error('outside the 24-hour window')]) {
      expect(isWindowClosedError(error)).toBe(false);
    }
    expect(failurePlan({ error: other, attempts: 1, now: NOW }).status).toBe('queued');
  });
});
