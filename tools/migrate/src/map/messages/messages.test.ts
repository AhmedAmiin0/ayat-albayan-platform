// mapMessages over invented CRM rows: direction, status, template keys, media, links, rejects.
import { describe, expect, it } from 'vitest';
import type { Mapped } from '../../types.ts';
import { EG, QA, SA, bundle, contact, crm, desired, message } from '../leads/fixtures.ts';
import { mapMessages, messageBody, messagesModule } from './messages.ts';

const at = (m: number) => `2026-09-12T09:${String(m).padStart(2, '0')}:00+00:00`;
const tables = crm({
  contacts: [
    contact('k1', SA),
    contact('k2', QA),
    contact('k3', ''),
    contact('k4', '966500000000'),
    contact('k5', EG),
  ],
  messages: [
    message({ id: 'm1', conv: 'c-k1', sender: 'customer', at: at(1), text: 'السلام عليكم' }),
    message({
      id: 'm2',
      conv: 'c-k1',
      sender: 'bot',
      at: at(2),
      template: 'lesson_reminder_v2',
      replyTo: 'm1',
    }),
    message({ id: 'm3', conv: 'c-k1', sender: 'agent', at: at(3), status: 'failed' }),
    message({
      id: 'm4',
      conv: 'c-k2',
      sender: 'customer',
      at: at(4),
      type: 'audio',
      text: null,
      media: { url: 'https://crm.example/a.ogg', mime: 'audio/ogg' },
    }),
    message({ id: 'm5', conv: 'c-k3', sender: 'customer', at: at(5) }),
    message({ id: 'm6', conv: 'c-k4', sender: 'customer', at: at(6) }),
    message({ id: 'm7', conv: 'c-k1', sender: 'agent', at: at(7), status: 'pending' }),
    message({ id: 'm8', conv: 'c-k1', sender: 'system', at: at(8) }),
    message({ id: 'm9', conv: 'c-gone', sender: 'customer', at: at(9) }),
    message({ id: 'm10', conv: 'c-k5', sender: 'customer', at: at(10), wamid: null }),
  ],
});
const out = mapMessages(
  bundle({
    crm: tables,
    earlier: new Map([
      ['leads', [desired('leads', `+${SA}`), desired('leads', `+${QA}`)]],
      ['guardians', [desired('guardians', `+${QA}`)]],
    ]),
  }),
);
const ok = new Map(out.flatMap((m) => (m.ok ? [[m.ref.id, m] as const] : [])));
const cols = (id: string) => {
  const m: Mapped | undefined = ok.get(id);
  return m?.ok ? m.value.columns : undefined;
};

describe('mapMessages', () => {
  it('maps an inbound text: wamid key, lead link, read history', () => {
    const m = ok.get('m1');
    expect(m?.ok && m.key).toEqual({ entity: 'messages', key: 'wamid.m1' });
    expect(m?.ok && m.value.refs).toEqual({ lead_id: { entity: 'leads', key: `+${SA}` } });
    expect(cols('m1')).toMatchObject({
      direction: 'inbound',
      phone_e164: `+${SA}`,
      body: 'السلام عليكم',
      status: 'delivered',
      created_at: at(1),
      sent_at: null,
      read_at: at(1),
      template_key: null,
    });
  });

  it('maps outbound templates to registry keys and replies to wamids', () => {
    expect(cols('m2')).toMatchObject({
      direction: 'outbound',
      template_key: 'lesson_reminder',
      body: 'text m2',
      status: 'read',
      sent_at: at(2),
      read_at: null,
      reply_to_wa_id: 'wamid.m1',
    });
    expect(cols('m3')).toMatchObject({ status: 'failed', sent_at: null });
  });

  it('keeps media as a URL to fetch later, and links a guardian instead of a lead', () => {
    expect(cols('m4')).toMatchObject({
      body: 'https://crm.example/a.ogg',
      media_mime: 'audio/ogg',
    });
    const m4 = ok.get('m4');
    expect(m4?.ok && m4.value.refs).toEqual({
      guardian_id: { entity: 'guardians', key: `+${QA}` },
    });
  });

  it('falls back to the CRM id without a wamid, and to no link without a lead', () => {
    const m10 = ok.get('m10');
    expect(m10?.ok && m10.key.key).toBe('crm:m10');
    expect(m10?.ok && m10.value.refs).toEqual({});
  });

  it('rejects bad phones, test contacts, unknown sender/status and orphans', () => {
    const rejected = out.flatMap((m) =>
      m.ok ? [] : m.issues.map((i) => [m.ref.id, i.code, i.field]),
    );
    expect(rejected).toEqual([
      ['m5', 'bad_phone', 'phone'],
      ['m6', 'test_row', 'phone'],
      ['m7', 'unmapped_value', 'status'],
      ['m8', 'unmapped_value', 'sender_type'],
      ['m9', 'missing_field', 'conversation_id'],
    ]);
  });

  it('never imports a queued row (the sender would send it)', () => {
    for (const m of out) if (m.ok) expect(m.value.columns['status']).not.toBe('queued');
  });

  it('adopts webhook-stored rows by wamid', () => {
    expect(messagesModule).toMatchObject({ entity: 'messages', adoptBy: 'wa_message_id' });
  });
});

describe('messageBody', () => {
  it('prefers text, then the media URL, then a type marker', () => {
    expect(messageBody({ content_text: ' hi ', media_url: 'u' })).toBe('hi');
    expect(messageBody({ content_text: '', media_url: 'u' })).toBe('u');
    expect(messageBody({ content_type: 'image' })).toBe('[image]');
    expect(messageBody({})).toBe('[unknown]');
  });
});
