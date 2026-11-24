import { describe, expect, it } from 'vitest';
import { crmInboundEvent, mediaMimeOf } from '@/modules/messaging/webhook/crm-inbound/crm-inbound.event';
import { contactCard, crmItem, MEDIA_LINK, queued, RECEIVED_AT, WAMID } from './crm-inbound.fakes';

// docs/19 «crm driver»: a CRM message.received as the inbound path's event. Pure.

const NOTIF = { line: 'notifications' as const, numberId: null };

describe('crmInboundEvent', () => {
  it('a text: the contact phone as wa_id, the name, the line, the CRM time', () => {
    const e = crmInboundEvent({ row: queued(), contact: contactCard(), media: null, place: NOTIF });
    expect(e).toEqual({
      waMessageId: WAMID,
      from: '966500000001',
      name: 'أم أحمد',
      at: new Date(RECEIVED_AT),
      type: 'text',
      body: 'السلام عليكم',
      replyKey: null,
      replyTo: null,
      mediaId: null,
      mediaMime: null,
      payload: null,
      line: 'notifications',
    });
  });

  it('a phone with + and spaces, a module-mode number id', () => {
    const place = { line: 'notifications' as const, numberId: 'num-crm' };
    const contact = contactCard({ phone: '+966 50 000 0001', name: null });
    const e = crmInboundEvent({ row: queued(), contact, media: null, place });
    expect(e).toMatchObject({ from: '966500000001', name: null, numberId: 'num-crm' });
  });

  it('no phone, or not a phone: null', () => {
    const row = queued();
    const of = (phone: string | null) =>
      crmInboundEvent({ row, contact: contactCard({ phone }), media: null, place: NOTIF });
    expect([of(null), of('abc')]).toEqual([null, null]);
  });

  it('a photo in the CRM storage: the link as body with its mime (the inbox fetches it)', () => {
    const row = queued({ content_type: 'image', body: 'تم' });
    const e = crmInboundEvent({ row, contact: contactCard(), media: crmItem(), place: NOTIF });
    const want = { type: 'image', body: MEDIA_LINK, mediaMime: 'image/jpeg', mediaId: null };
    expect(e).toMatchObject(want);
  });

  it('a file the CRM could not copy (a proxy link): the caption as text, no mime', () => {
    const row = queued({ content_type: 'audio', body: null });
    const media = crmItem({ media_url: '/api/whatsapp/media/123' });
    const e = crmInboundEvent({ row, contact: contactCard(), media, place: NOTIF });
    expect(e).toMatchObject({ type: 'audio', body: null, mediaMime: null });
  });
});

describe('mediaMimeOf', () => {
  it.each([
    [{ media_type: 'image/png' }, 'image/png'],
    [{ media_url: MEDIA_LINK.replace('.jpg', '.ogg'), content_type: 'audio' }, 'audio/ogg'],
    [{ media_url: MEDIA_LINK.replace('.jpg', '.pdf'), content_type: 'document' }, 'application/pdf'],
    [{ media_url: MEDIA_LINK.replace('.jpg', ''), content_type: 'video' }, 'video/mp4'],
    [{ media_url: MEDIA_LINK.replace('.jpg', ''), content_type: 'location' }, null],
  ])('%o → %s', (over, want) => {
    expect(mediaMimeOf(crmItem({ media_type: null, ...over }))).toBe(want);
  });
});
