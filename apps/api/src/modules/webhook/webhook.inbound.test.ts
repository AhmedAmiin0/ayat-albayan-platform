import { describe, expect, it } from 'vitest';
import { AT, event, GUARDIAN_ID, LESSON_ID, nobody } from './webhook.fakes';
import { inboundPush, inboundRow, intentOf, payloadLesson, pushPreview, PUSH_BUCKET_MS } from './webhook.inbound';

const PHONE = '+966501234567';
const guardian = { ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } };

describe('intentOf', () => {
  it('reads our button payload before the button text', () => {
    expect(intentOf(event({ body: 'وقف الرسايل', replyKey: `confirm:${LESSON_ID}` }))).toBe('confirm');
  });

  it('reads a typed reply', () => {
    expect(intentOf(event({ body: 'تمام إن شاء الله' }))).toBe('confirm');
    expect(intentOf(event({ body: 'ممكن نأجلها؟' }))).toBe('reschedule');
    expect(intentOf(event({ body: 'وقف' }))).toBe('stop');
    expect(intentOf(event({ body: 'السلام عليكم' }))).toBeNull();
    expect(intentOf(event({ body: null }))).toBeNull();
  });
});

describe('payloadLesson', () => {
  it('takes the lesson id from a delivered button payload only', () => {
    expect(payloadLesson(event({ replyKey: `confirm:${LESSON_ID}` }))).toBe(LESSON_ID);
    expect(payloadLesson(event({ body: `confirm:${LESSON_ID}` }))).toBeNull();
  });

  it('ignores a payload that is not one of ours or not a uuid', () => {
    expect(payloadLesson(event({ replyKey: 'r1' }))).toBeNull();
    expect(payloadLesson(event({ replyKey: 'confirm:not-a-uuid' }))).toBeNull();
  });
});

describe('inboundRow', () => {
  it('stores an inbound row as delivered and unread, linked by phone', () => {
    const m = event({ replyTo: 'wamid.OUT1', type: 'image', body: null, mediaId: 'media-1', mediaMime: 'image/jpeg' });
    expect(inboundRow({ m, phone: PHONE, who: guardian, leadId: null, lessonId: LESSON_ID })).toEqual({
      direction: 'inbound',
      status: 'delivered',
      phone_e164: PHONE,
      lead_id: null,
      guardian_id: GUARDIAN_ID,
      lesson_id: LESSON_ID,
      body: null,
      wa_message_id: 'wamid.IN1',
      reply_to_wa_id: 'wamid.OUT1',
      media_id: 'media-1',
      media_mime: 'image/jpeg',
      interactive_payload: null,
    });
  });
});

describe('pushPreview', () => {
  it('is the text, else «بعت …» with the media kind', () => {
    expect(pushPreview(event({ body: '  أهلا  ' }))).toBe('أهلا');
    expect(pushPreview(event({ type: 'audio', body: null }))).toBe('بعت رسالة صوتية');
    expect(pushPreview(event({ type: 'reaction', body: null }))).toBe('بعت رسالة مش مدعومة — افتحها من واتساب');
  });
});

describe('inboundPush', () => {
  it('is new_lead for a number we did not know, keyed by the new lead', () => {
    const push = inboundPush({ m: event(), phone: PHONE, who: nobody(), newLeadId: 'lead-9', intent: null });
    expect(push).toEqual({
      kind: 'new_lead',
      event: { subject: 'lead-9', vars: { name: 'أم سهيلة', text: 'السلام عليكم' }, data: { phone: PHONE } },
    });
  });

  it('is new_message for a known number, one per phone per 10 minutes', () => {
    const push = inboundPush({ m: event({ name: null }), phone: PHONE, who: guardian, newLeadId: null, intent: null });
    const bucket = Math.floor(AT.getTime() / PUSH_BUCKET_MS);
    expect(push.kind).toBe('new_message');
    expect(push.event).toMatchObject({ subject: `${PHONE}:${bucket}`, vars: { name: 'أم سهيلة' } });
    const later = event({ at: new Date(AT.getTime() + PUSH_BUCKET_MS) });
    const next = inboundPush({ m: later, phone: PHONE, who: guardian, newLeadId: null, intent: null });
    expect(next.event.subject).not.toBe(push.event.subject);
  });

  it('gives a reschedule or stop request its own push', () => {
    const push = inboundPush({ m: event(), phone: PHONE, who: guardian, newLeadId: null, intent: 'reschedule' });
    expect(push.event.subject).toBe(`${PHONE}:reschedule:wamid.IN1`);
  });

  it('names an unknown sender by profile name, else the phone', () => {
    const push = inboundPush({ m: event({ name: null }), phone: PHONE, who: nobody(), newLeadId: null, intent: null });
    expect(push.event.vars['name']).toBe(PHONE);
  });
});
