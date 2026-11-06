import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { EVOLUTION_SEND_ERROR, type NumbersEvolution } from '@/modules/messaging/numbers';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import type { WebhookRepo } from '@/modules/messaging/webhook/webhook.repo';
import { EvolutionRestriction } from './evolution-restriction';

// Review fix 3: ERRORs on our sends are counted; at the trip the number goes off and the bell
// rings once. A single ERROR only fails its row (the trip says no).

const NOW = new Date('2026-11-06T10:00:00Z');
const event = (errorCode: string | null): StatusEvent => ({
  waMessageId: 'EVO-OUT-1', status: 'failed', at: NOW, errorCode, errorText: null,
  conversationId: null, pricingCategory: null,
});

const SENT = '2026-11-06T09:59:00Z';

function setup(tripped = true, sentAt: string | null = SENT) {
  const numbers = { tripOnErrors: vi.fn(async (_id: string, _at: unknown) => tripped) };
  const rows = { outboundByWaId: vi.fn(async () => (sentAt ? { sent_at: sentAt } : null)) };
  const push = { notifyAdmins: vi.fn(async (_kind: string, _event: unknown) => undefined) };
  const r = new EvolutionRestriction(
    numbers as unknown as NumbersEvolution, push as unknown as PushService,
    rows as unknown as WebhookRepo,
  );
  return { r, numbers, push, rows };
}

describe('EvolutionRestriction', () => {
  it('an ERROR on our send that reaches the trip: the number goes off, the bell rings once', async () => {
    const { r, numbers, push, rows } = setup();
    await r.check([event(null), event(EVOLUTION_SEND_ERROR)], { numberId: 'evo-1', now: NOW });
    expect(rows.outboundByWaId).toHaveBeenCalledWith('EVO-OUT-1');
    expect(numbers.tripOnErrors).toHaveBeenCalledWith('evo-1', { now: NOW, sentAt: SENT });
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(push.notifyAdmins.mock.calls[0]?.[1]).toMatchObject({ subject: 'evolution_restricted:evo-1:2026-11-06' });
  });

  it('a single ERROR under the trip only fails its row: no bell', async () => {
    const { r, push } = setup(false);
    await r.check([event(EVOLUTION_SEND_ERROR)], { numberId: 'evo-1', now: NOW });
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('an ERROR for a message we never sent, or no ERROR, counts nothing', async () => {
    const none = setup(true, null);
    await none.r.check([event(EVOLUTION_SEND_ERROR)], { numberId: 'evo-1', now: NOW });
    expect(none.numbers.tripOnErrors).not.toHaveBeenCalled();
    const plain = setup();
    await plain.r.check([event('131026'), event(null)], { numberId: 'evo-1', now: NOW });
    expect(plain.numbers.tripOnErrors).not.toHaveBeenCalled();
  });
});
