import { describe, expect, it } from 'vitest';
import type { StatusEvent } from '../webhook.events';
import { nobody } from '../webhook.fakes';
import { externalMessage, type ExternalMessage } from './external-message';
import { externalRow, templateKeyFor } from './external-row';
import { kapsoText, KAPSO_NUMBER_ID, SENT_AT } from './external.fakes';

const msg = (over: Record<string, unknown> = {}): ExternalMessage => {
  const m = externalMessage(kapsoText(over));
  if (!m) throw new Error('fixture');
  return m;
};
const from = { line: 'chat' as const, numberId: KAPSO_NUMBER_ID };
const status = (s: StatusEvent['status'], at = new Date(SENT_AT.getTime() + 60_000)): StatusEvent => ({
  waMessageId: 'wamid.EXT1', status: s, at, errorCode: s === 'failed' ? '131026' : null, errorText: null, conversationId: null, pricingCategory: null,
});

describe('externalRow', () => {
  it('outbound history: WhatsApp time as created_at and sent_at, created_by null, never queued', () => {
    const row = externalRow({ msg: msg(), phone: '+966501234567', who: nobody(), from, at: SENT_AT });
    expect(row).toMatchObject({
      direction: 'outbound',
      status: 'delivered',
      phone_e164: '+966501234567',
      body: 'تم تأكيد الموعد',
      wa_message_id: 'wamid.EXT1',
      created_at: SENT_AT.toISOString(),
      sent_at: SENT_AT.toISOString(),
      created_by: null,
      line: 'chat',
      number_id: KAPSO_NUMBER_ID,
    });
    expect(row).not.toHaveProperty('attempts');
  });

  it('the status event moves it forward (read stamps read_at with the event time); never backwards', () => {
    const read = externalRow({ msg: msg(), phone: '+1', who: nobody(), from, at: SENT_AT, event: status('read') });
    expect(read).toMatchObject({ status: 'read', read_at: new Date(SENT_AT.getTime() + 60_000).toISOString() });
    const sent = externalRow({ msg: msg(), phone: '+1', who: nobody(), from, at: SENT_AT, event: status('sent') });
    expect(sent.status).toBe('delivered');
  });

  it('failed: no sent_at, the error kept', () => {
    const row = externalRow({ msg: msg({ kapso: {} }), phone: '+1', who: nobody(), from, at: SENT_AT, event: status('failed') });
    expect(row).toMatchObject({ status: 'failed', sent_at: null, error_code: '131026' });
  });

  it('links the guardian, else the lead (as the chat import did)', () => {
    const both = { guardian: { id: 'g1', name: 'أم سهيلة' }, teacher: null, lead: { id: 'l1', name: null, follow_up_stage: 0 } };
    expect(externalRow({ msg: msg(), phone: '+1', who: both, from, at: SENT_AT })).toMatchObject({ guardian_id: 'g1', lead_id: null });
    const lead = { ...both, guardian: null };
    expect(externalRow({ msg: msg(), phone: '+1', who: lead, from, at: SENT_AT })).toMatchObject({ guardian_id: null, lead_id: 'l1' });
  });

  it('a template keeps its key and params; a caption-less media gets a type marker; no line → no key', () => {
    const t = msg({ type: 'template', text: undefined, template: { name: 'lesson_reminder_v2', components: [] } });
    expect(externalRow({ msg: t, phone: '+1', who: nobody(), from, at: SENT_AT })).toMatchObject({ template_key: 'lesson_reminder', body: null });
    const img = msg({ type: 'image', text: undefined, image: { id: 'm1', mime_type: 'image/jpeg' } });
    const row = externalRow({ msg: img, phone: '+1', who: nobody(), from: { line: null, numberId: null }, at: SENT_AT });
    expect(row).toMatchObject({ body: '[image]', media_id: 'm1', media_mime: 'image/jpeg' });
    expect(row).not.toHaveProperty('line');
    expect(row).not.toHaveProperty('number_id');
    expect(templateKeyFor('follow_up_slots')).toBe('follow_up_slots');
  });
});
