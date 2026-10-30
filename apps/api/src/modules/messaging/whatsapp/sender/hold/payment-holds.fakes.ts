import { vi } from 'vitest';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { PaymentHoldRepo } from './payment-hold.repo';
import { PaymentHolds } from './payment-holds';

// Test-only (excluded from the build): the line hold over a fake repo.

export const MIN = 60_000;
export const NOW = new Date('2026-10-30T08:00:00Z');
export const at = (min: number) => new Date(NOW.getTime() + min * MIN);
export const iso = (min: number) => at(min).toISOString();
export const NOTIFICATIONS = { line: 'notifications' as const };

/** A 131042 row-hold plan as failurePlan writes it. */
export const heldPlan = (next: string): FailurePlan => ({
  status: 'queued',
  next_attempt_at: next,
  error_code: 'wa_payment_hold',
  error_text: '(#131042) payment issue',
  attempts: 0,
});

export function fakeHolds() {
  const ok = async () => undefined;
  const repo = { defer: vi.fn(ok), deferMany: vi.fn(ok), move: vi.fn(ok) };
  return { repo, holds: new PaymentHolds(repo as unknown as PaymentHoldRepo) };
}
