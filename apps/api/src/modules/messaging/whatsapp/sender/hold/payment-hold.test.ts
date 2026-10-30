import { describe, expect, it } from 'vitest';
import { crmErrorFrom } from '../../drivers/crm/crm-http';
import { byDriver } from '../../drivers/meta/graph';
import { KAPSO_ENV } from '../../drivers/kapso/kapso.fakes';
import { failurePlan } from '../send-plan';
import { STUB_ENV } from '../../whatsapp.fakes';
import type { NumberRoute } from '../../numbers/number-route';
import { WaError } from '../../whatsapp.types';
import { holdKey, paymentSubject, WA_PAYMENT_HOLD } from './payment-hold';

// Meta 131042 «Business eligibility payment issue» (docs/12 §3.3): held, never failed per message.

const NOW = new Date('2026-10-30T08:00:00Z');
const MIN = 60_000;
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const payment = (status = 400) =>
  new WaError('(#131042) Business eligibility payment issue', {
    code: 131042,
    status,
    details: 'no payment method',
  });
const plan = (
  row: { created_at?: string; scheduled_for?: string | null; expires_at: string | null },
  attempts = 1,
) => failurePlan({ error: payment(), attempts, now: NOW, row });
const nextIn = (row: Parameters<typeof plan>[0]) =>
  Date.parse(plan(row).next_attempt_at ?? '') - NOW.getTime();

describe('failurePlan — 131042 is a payment hold', () => {
  it.each([
    { driver: 'meta', error: byDriver(STUB_ENV, payment()) },
    { driver: 'kapso (Meta body proxied, HTTP 400)', error: byDriver(KAPSO_ENV, payment()) },
    {
      driver: 'kapso (HTTP 403 with Meta 131042: still Meta, not a refused key)',
      error: byDriver(KAPSO_ENV, payment(403)),
    },
  ])('$driver: queued as wa_payment_hold, the try not counted', ({ error }) => {
    expect(
      failurePlan({ error, attempts: 2, now: NOW, row: { created_at: ago(0), expires_at: null } }),
    ).toEqual({
      status: 'queued',
      next_attempt_at: '2026-10-30T08:30:00.000Z',
      error_code: WA_PAYMENT_HOLD,
      error_text: '(#131042) Business eligibility payment issue — no payment method',
      attempts: 1,
    });
  });

  it('the first try of a row: attempts back to 0', () => {
    expect(plan({ expires_at: null }, 1).attempts).toBe(0);
  });

  it.each([
    { waited: 0, hold: 30 },
    { waited: 30, hold: 60 },
    { waited: 90, hold: 120 },
    { waited: 210, hold: 240 },
    { waited: 450, hold: 360 },
    { waited: 1_000, hold: 360 },
  ])('waited $waited min → held $hold min (doubling, capped at 6 h)', ({ waited, hold }) => {
    expect(nextIn({ created_at: ago(waited * MIN), expires_at: null })).toBe(hold * MIN);
  });

  it('a scheduled row counts from scheduled_for, not when it was queued', () => {
    expect(
      nextIn({ created_at: ago(3 * 24 * 60 * MIN), scheduled_for: ago(0), expires_at: null }),
    ).toBe(30 * MIN);
  });

  it('expiry wins: never held past expires_at (the worker expires it then)', () => {
    const expires_at = new Date(NOW.getTime() + 10 * MIN).toISOString();
    expect(plan({ created_at: ago(0), expires_at }).next_attempt_at).toBe(expires_at);
  });

  it('due 48 h ago: no longer held, fails as 131042 (never days late)', () => {
    expect(plan({ created_at: ago(48 * 60 * MIN), expires_at: null })).toMatchObject({
      status: 'failed',
      next_attempt_at: null,
      error_code: '131042',
    });
  });

  it('crm driver: its envelope has no Meta code, so meta_error still fails at once (not held)', () => {
    const crm = crmErrorFrom({
      status: 502,
      text: '{"error":{"code":"meta_error","message":"131042"}}',
      retryAfter: null,
    });
    expect(failurePlan({ error: crm, attempts: 1, now: NOW })).toMatchObject({
      status: 'failed',
      error_code: 'crm_meta_error',
    });
  });

  it('other account codes are unchanged: 131031 fails at once', () => {
    const locked = new WaError('locked', { code: 131031, status: 400 });
    expect(failurePlan({ error: locked, attempts: 1, now: NOW })).toMatchObject({
      status: 'failed',
      error_code: '131031',
    });
  });
});

describe('hold keys and the push subject', () => {
  const route: NumberRoute = { numberId: 'n-1', line: 'chat' };
  it('per line under legacy, per number in module mode, one push subject per day', () => {
    expect(holdKey({ line: 'chat' })).toBe('line:chat');
    expect(holdKey({ line: 'chat', route })).toBe('number:n-1');
    expect(paymentSubject({ line: 'notifications', now: NOW })).toBe('whatsapp_payment:2026-10-30');
    expect(paymentSubject({ line: 'chat', now: NOW })).toBe('whatsapp_payment:chat:2026-10-30');
    expect(paymentSubject({ line: 'chat', route, now: NOW })).toBe(
      'whatsapp_payment:number:n-1:2026-10-30',
    );
  });
});
