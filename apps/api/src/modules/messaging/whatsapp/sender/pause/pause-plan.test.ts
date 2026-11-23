import { describe, expect, it } from 'vitest';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import { pauseOf, timeoutPause } from './pause-plan';

const NOW = new Date('2026-11-22T08:15:00Z');
const plan = (error_code: string, attempts?: number): FailurePlan => ({
  status: 'queued', next_attempt_at: null, error_code, error_text: 'why', ...(attempts === undefined ? {} : { attempts }),
});
const at = (p: FailurePlan) => ({ row: { id: 'm1' }, line: 'notifications' as const, now: NOW, plan: p });
const route = { numberId: 'n-1', line: 'chat' as const };

describe('pauseOf', () => {
  it('the CRM rate limit pauses without a push', () => {
    expect(pauseOf(at(plan('crm_rate_limited', 0)))).toEqual({ subject: null, log: null });
  });

  it('131042: one push per line a day', () => {
    expect(pauseOf(at(plan('wa_payment_hold', 0)))?.subject).toBe('whatsapp_payment:2026-11-22');
  });

  it('an outage: one push per line (number) an hour', () => {
    expect(pauseOf(at(plan('wa_line_down', 0)))?.subject).toBe('whatsapp_outage:notifications:2026-11-22T08');
    const onNumber = { ...at(plan('wa_line_down', 0)), route };
    expect(pauseOf(onNumber)?.subject).toBe('whatsapp_outage:number:n-1:2026-11-22T08');
  });

  it('any other uncounted try is the token', () => {
    expect(pauseOf(at(plan('190', 0)))?.subject).toBe('whatsapp_auth:2026-11-22');
  });

  it('a counted retry or a failure is the row alone', () => {
    expect(pauseOf(at(plan('131000')))).toBeNull();
    expect(pauseOf(at({ ...plan('uncertain'), status: 'failed' }))).toBeNull();
  });

  it('timeouts share the outage subject', () => {
    expect(timeoutPause({ row: { id: 'm1' }, line: 'chat', now: NOW }).subject).toBe(
      'whatsapp_outage:chat:2026-11-22T08',
    );
  });
});
