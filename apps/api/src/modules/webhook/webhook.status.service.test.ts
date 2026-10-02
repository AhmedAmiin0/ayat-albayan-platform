import { describe, expect, it } from 'vitest';
import type { StatusEvent } from './webhook.events';
import { outbound, services } from './webhook.fakes';
import { failedLabel } from './webhook.status.service';

const AT = new Date('2026-10-03T13:00:00Z');
const ev = (over: Partial<StatusEvent> = {}): StatusEvent => ({
  waMessageId: 'wamid.OUT1',
  status: 'delivered',
  at: AT,
  errorCode: null,
  errorText: null,
  conversationId: 'conv-1',
  pricingCategory: 'utility',
  ...over,
});

describe('StatusService (R-MSG-05)', () => {
  it('moves the row by wa_message_id with compare-and-set on its status', async () => {
    const s = services();
    s.queries.outboundByWaId.mockResolvedValue(outbound());
    await s.statuses.handle(ev());
    expect(s.queries.outboundByWaId).toHaveBeenCalledWith('wamid.OUT1');
    expect(s.queries.moveStatus).toHaveBeenCalledWith({
      id: 'msg-out-1',
      from: 'sent',
      patch: expect.objectContaining({ status: 'delivered', delivered_at: AT.toISOString(), wa_conversation_id: 'conv-1' }),
    });
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('ignores a wamid we never sent and a status that would move backwards', async () => {
    const s = services();
    await s.statuses.handle(ev());
    s.queries.outboundByWaId.mockResolvedValue(outbound({ status: 'read' }));
    await s.statuses.handle(ev());
    expect(s.queries.moveStatus).not.toHaveBeenCalled();
  });

  it('re-reads once when another status won the race', async () => {
    const s = services();
    s.queries.outboundByWaId
      .mockResolvedValueOnce(outbound({ status: 'sent' }))
      .mockResolvedValueOnce(outbound({ status: 'delivered' }));
    s.queries.moveStatus.mockResolvedValueOnce(false);
    await s.statuses.handle(ev({ status: 'read' }));
    expect(s.queries.moveStatus).toHaveBeenCalledTimes(2);
    expect(s.queries.moveStatus).toHaveBeenLastCalledWith(expect.objectContaining({ from: 'delivered' }));
  });

  it('failed: stores Meta’s error and pushes reminder_failed once per message', async () => {
    const s = services();
    s.queries.outboundByWaId.mockResolvedValue(outbound());
    await s.statuses.handle(ev({ status: 'failed', errorCode: '131026', errorText: 'Message undeliverable' }));
    expect(s.queries.moveStatus).toHaveBeenCalledWith(
      expect.objectContaining({ patch: expect.objectContaining({ status: 'failed', error_code: '131026' }) }),
    );
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('reminder_failed', {
      subject: `msg-out-1:${ev({ status: 'failed' }).waMessageId}`,
      vars: { template: 'تذكير الحلقة النهاردة — Jitsi', name: 'أم سهيلة' },
      data: { phone: '+966501234567', messageId: 'msg-out-1' },
    });
  });

  it('a replayed status changes nothing', async () => {
    const s = services();
    s.queries.outboundByWaId.mockResolvedValue(outbound({ status: 'delivered' }));
    await s.statuses.handle(ev());
    expect(s.queries.moveStatus).not.toHaveBeenCalled();
  });
});

describe('failedLabel', () => {
  it('names a template by its Arabic name, else the start of the text', () => {
    expect(failedLabel({ template_key: 'renewal_due', body: null })).toBe('تذكير التجديد');
    expect(failedLabel({ template_key: 'legacy_x', body: null })).toBe('legacy_x');
    expect(failedLabel({ template_key: null, body: 'أهلا بحضرتك'.repeat(10) })).toHaveLength(40);
  });
});
