import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { callsOf, chainDb } from '../../reminders/chain-db.fake';
import { event, services } from '../webhook.fakes';
import { WebhookQueries } from '../webhook.queries';
import { WebhookSettings } from '../webhook.settings';
import { refillPatch } from './inbound-refill';

// Meta's 131060 (owner 2026-10-27): a new number's first message arrives as `unsupported`. A re-sent
// wamid with the real content fills that row in place, once, with no second push or lead.
const UNAVAILABLE = { type: 'unsupported', unsupported: null, errors: [{ code: 131060, title: 'This message is unavailable.' }] };
const unavailable = () => event({ type: 'unsupported', body: null, payload: UNAVAILABLE });

describe('InboundService: a re-sent wamid', () => {
  it('a normal message sent again stays as it was: no update, no second push', async () => {
    const s = services();
    await s.inbound.handle(event());
    await s.inbound.handle(event({ body: 'نص آخر' }));
    expect(s.queries.stored).toHaveLength(1);
    expect(s.queries.stored[0]?.body).toBe('السلام عليكم');
    expect(s.push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('an unavailable row takes the content Meta re-sent, once, with no second push or lead', async () => {
    const s = services();
    await s.inbound.handle(unavailable());
    await s.inbound.handle(event({ type: 'image', body: 'صورة الواجب', mediaId: 'media-1', mediaMime: 'image/jpeg' }));
    expect(s.queries.stored).toEqual([
      expect.objectContaining({ body: 'صورة الواجب', media_id: 'media-1', media_mime: 'image/jpeg', interactive_payload: null }),
    ]);
    await s.inbound.handle(event({ body: 'مرة ثالثة' }));
    expect(s.queries.stored[0]?.body).toBe('صورة الواجب');
    expect(s.push.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(s.push.notifySales).toHaveBeenCalledTimes(1);
    expect(s.queries.updateLead).not.toHaveBeenCalled();
  });

  it('an unavailable row sent again still unsupported stays as it was', async () => {
    const s = services();
    await s.inbound.handle(unavailable());
    await s.inbound.handle(unavailable());
    expect(s.queries.stored).toEqual([expect.objectContaining({ body: null, interactive_payload: UNAVAILABLE })]);
    expect(s.push.notifyAdmins).toHaveBeenCalledTimes(1);
  });
});

describe('refillPatch / WebhookQueries.insertInbound', () => {
  it('is the content columns, or nothing for an event that is itself unsupported', () => {
    expect(refillPatch({ phone_e164: '+966501234567', direction: 'inbound', body: 'نعم', interactive_payload: null })).toEqual({
      body: 'نعم',
      media_id: null,
      media_mime: null,
      interactive_payload: null,
      reply_to_wa_id: null,
    });
    expect(refillPatch({ phone_e164: '+966501234567', direction: 'inbound', interactive_payload: UNAVAILABLE })).toBeNull();
  });

  it('a replay updates only the inbound row of that wamid whose payload is still unsupported', async () => {
    const { db, log } = chainDb({ messages: [{ data: [] }, { data: [{ id: 'm1' }] }] });
    const row = { phone_e164: '+966501234567', direction: 'inbound' as const, wa_message_id: 'wamid.IN1', body: 'نعم' };
    await expect(new WebhookQueries(db, readerOf(WebhookSettings)).insertInbound(row)).resolves.toBe(false);
    expect(callsOf(log, 'messages', 1)).toEqual([
      ['update', [expect.objectContaining({ body: 'نعم' })]],
      ['eq', ['wa_message_id', 'wamid.IN1']],
      ['eq', ['direction', 'inbound']],
      ['eq', ['interactive_payload->>type', 'unsupported']],
      ['select', ['id']],
    ]);
  });

  it('a new wamid is stored and nothing is updated; an unsupported replay reads nothing more', async () => {
    const { db, log } = chainDb({ messages: [{ data: [{ id: 'm1' }] }, { data: [] }] });
    const q = new WebhookQueries(db, readerOf(WebhookSettings));
    await expect(q.insertInbound({ phone_e164: '+966501234567', direction: 'inbound', wa_message_id: 'w1', body: 'نعم' })).resolves.toBe(true);
    await expect(q.insertInbound({ phone_e164: '+966501234567', direction: 'inbound', wa_message_id: 'w1', interactive_payload: UNAVAILABLE })).resolves.toBe(false);
    expect(log.filter((l) => l.table === 'messages')).toHaveLength(2);
  });
});
