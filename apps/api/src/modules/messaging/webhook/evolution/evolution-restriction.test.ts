import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import type { NumbersEvolution } from '@/modules/messaging/numbers';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { EVOLUTION_RESTRICTED } from '@/modules/messaging/webhook/parse/webhook.evolution';
import type { WebhookRepo } from '@/modules/messaging/webhook/webhook.repo';
import { EvolutionRestriction } from './evolution-restriction';

// docs/19: a late 463 / 475 switches the Evolution number off and rings the admins' bell once.

const NOW = new Date('2026-11-06T10:00:00Z');
const event = (errorCode: string | null): StatusEvent => ({
  waMessageId: 'EVO-OUT-1', status: 'failed', at: NOW, errorCode, errorText: null,
  conversationId: null, pricingCategory: null,
});

const SENT = '2026-11-06T09:59:00Z';

function setup(switchedOff = true, sentAt: string | null = SENT) {
  const numbers = { restrict: vi.fn(async (_id: string, _at: unknown) => switchedOff) };
  const rows = { outboundByWaId: vi.fn(async () => (sentAt ? { sent_at: sentAt } : null)) };
  const push = { notifyAdmins: vi.fn(async (_kind: string, _event: unknown) => undefined) };
  const r = new EvolutionRestriction(
    numbers as unknown as NumbersEvolution, push as unknown as PushService,
    rows as unknown as WebhookRepo,
  );
  return { r, numbers, push };
}

describe('EvolutionRestriction', () => {
  it('restricted: the number goes off and the bell rings once', async () => {
    const { r, numbers, push } = setup();
    await r.check([event(null), event(EVOLUTION_RESTRICTED)], { numberId: 'evo-1', now: NOW });
    expect(numbers.restrict).toHaveBeenCalledWith('evo-1', { now: NOW, sentAt: SENT });
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(push.notifyAdmins.mock.calls[0]?.[1]).toMatchObject({ subject: 'evolution_restricted:evo-1:2026-11-06' });
  });

  it('a refusal for a message we never sent (no row) switches nothing off', async () => {
    const { r, numbers } = setup(true, null);
    await r.check([event(EVOLUTION_RESTRICTED)], { numberId: 'evo-1', now: NOW });
    expect(numbers.restrict).not.toHaveBeenCalled();
  });

  it('already off: no second bell; a plain failure touches nothing', async () => {
    const off = setup(false);
    await off.r.check([event(EVOLUTION_RESTRICTED)], { numberId: 'evo-1', now: NOW });
    expect(off.push.notifyAdmins).not.toHaveBeenCalled();
    const plain = setup();
    await plain.r.check([event('131026'), event(null)], { numberId: 'evo-1', now: NOW });
    expect(plain.numbers.restrict).not.toHaveBeenCalled();
  });
});
