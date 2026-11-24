import { describe, expect, it, vi } from 'vitest';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { outbound, services } from '@/modules/messaging/webhook/tests/webhook.fakes';

// docs/19 «Confirming an uncertain send»: a /webhooks/wacrm status for an unknown wamid asks the
// CRM confirm (never Kapso); once a row holds the wamid, the normal path moves it on.

const META: StatusEvent = {
  waMessageId: 'wamid.crm-1',
  status: 'read',
  at: new Date('2026-11-15T20:29:00Z'),
  errorCode: null,
  errorText: null,
  conversationId: null,
  pricingCategory: null,
};
const ev = (): StatusEvent => ({ ...META, crm: { conversationId: 'c-1' } });

describe('StatusService on the CRM webhook', () => {
  it('an unknown wamid: the CRM confirm, then the confirmed row moves on', async () => {
    const s = services();
    const kapso = vi.spyOn(s.external.status, 'adopt');
    s.crm.adopt.mockResolvedValueOnce(true);
    s.queries.outboundByWaId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(outbound({ status: 'delivered' }));
    await s.statuses.handle(ev());
    expect(s.crm.adopt).toHaveBeenCalledWith(ev());
    expect(kapso).not.toHaveBeenCalled();
    expect(s.queries.moveStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'delivered',
        patch: expect.objectContaining({ status: 'read' }),
      }),
    );
  });

  it('not confirmed: ignored as before; a Meta or Kapso status never asks the CRM', async () => {
    const s = services();
    await s.statuses.handle(ev());
    expect(s.queries.moveStatus).not.toHaveBeenCalled();
    await s.statuses.handle(META);
    expect(s.crm.adopt).toHaveBeenCalledTimes(1);
  });
});
