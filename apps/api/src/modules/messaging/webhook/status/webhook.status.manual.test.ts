import { describe, expect, it } from 'vitest';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { outbound, services } from '@/modules/messaging/webhook/webhook.fakes';
import { nextStatus, statusPatch } from './webhook.status';

// «أرسل عبر واتساب» (owner 2026-11-06): a sent_manually row the WhatsApp Business app's echo was
// attached to (it carries that wamid) takes delivered / read; one with no wamid never moves.

const AT = new Date('2026-11-06T10:05:00Z');
const ev = (status: StatusEvent['status']): StatusEvent => ({
  waMessageId: 'wamid.APP1',
  status,
  at: AT,
  errorCode: null,
  errorText: null,
  conversationId: null,
  pricingCategory: null,
});
const manual = { status: 'sent_manually' as const, sent_at: null, delivered_at: null, read_at: null };

describe('nextStatus: sent_manually', () => {
  it('attached: delivered and read move it; sent and failed do not', () => {
    expect(nextStatus('sent_manually', 'delivered', true)).toBe('delivered');
    expect(nextStatus('sent_manually', 'read', true)).toBe('read');
    expect(nextStatus('sent_manually', 'sent', true)).toBeNull();
    expect(nextStatus('sent_manually', 'failed', true)).toBeNull();
  });

  it('not attached: it never moves', () => {
    for (const s of ['sent', 'delivered', 'read', 'failed'] as const) {
      expect(nextStatus('sent_manually', s)).toBeNull();
    }
  });
});

describe('statusPatch: an attached sent_manually row', () => {
  it('read fills sent_at and delivered_at with the same instant', () => {
    const patch = statusPatch({ ...manual, wa_message_id: 'wamid.APP1' }, ev('read'));
    const at = AT.toISOString();
    expect(patch).toEqual({ status: 'read', sent_at: at, delivered_at: at, read_at: at });
  });

  it('no wamid (never attached): no change', () => {
    expect(statusPatch({ ...manual, wa_message_id: null }, ev('delivered'))).toBeNull();
    expect(statusPatch(manual, ev('read'))).toBeNull();
  });
});

describe('StatusService on a sent_manually row', () => {
  it('attached: moved to delivered by compare-and-set from sent_manually', async () => {
    const s = services();
    const row = outbound({ status: 'sent_manually', sent_at: null, wa_message_id: 'wamid.APP1' });
    s.queries.outboundByWaId.mockResolvedValue(row);
    await s.statuses.handle(ev('delivered'));
    expect(s.queries.moveStatus).toHaveBeenCalledWith({
      id: row.id,
      from: 'sent_manually',
      patch: expect.objectContaining({ status: 'delivered', delivered_at: AT.toISOString() }),
    });
  });

  it('a failed status never fails a sent_manually row, and never pushes', async () => {
    const s = services();
    const row = outbound({ status: 'sent_manually', wa_message_id: 'wamid.APP1' });
    s.queries.outboundByWaId.mockResolvedValue(row);
    await s.statuses.handle(ev('failed'));
    expect(s.queries.moveStatus).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
  });
});
