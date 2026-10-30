import { describe, expect, it, vi } from 'vitest';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { PaymentHoldRepo } from './payment-hold.repo';
import { PaymentHolds } from './payment-holds';

// The in-memory line hold behind the 131042 probe (docs/12 §13.17).

const NOW = new Date('2026-10-30T08:00:00Z');
const UNTIL = '2026-10-30T08:30:00.000Z';

function holds() {
  const repo = { defer: vi.fn(async () => undefined) };
  return { repo, h: new PaymentHolds(repo as unknown as PaymentHoldRepo) };
}

describe('PaymentHolds', () => {
  it('holds a key until its time, then forgets it', () => {
    const { h } = holds();
    expect(h.heldUntil('line:chat', NOW)).toBeNull();
    h.hold('line:chat', UNTIL);
    expect(h.heldUntil('line:chat', NOW)).toBe(UNTIL);
    expect(h.heldUntil('line:notifications', NOW)).toBeNull();
    expect(h.heldUntil('line:chat', new Date(UNTIL))).toBeNull();
    expect(h.heldUntil('line:chat', NOW)).toBeNull();
  });

  it('a missing or unreadable time holds nothing', () => {
    const { h } = holds();
    h.hold('line:chat', null);
    h.hold('line:notifications', 'not a date');
    expect(h.heldUntil('line:chat', NOW)).toBeNull();
    expect(h.heldUntil('line:notifications', NOW)).toBeNull();
  });

  it('defers a row to the hold end with the reason, keeping its attempts for the compare-and-set', async () => {
    const { h, repo } = holds();
    await h.defer(dueMessage({ id: 'm-2', attempts: 1 }), UNTIL);
    expect(repo.defer).toHaveBeenCalledWith({
      id: 'm-2',
      attempts: 1,
      next: UNTIL,
      text: expect.stringContaining('131042'),
    });
  });
});
