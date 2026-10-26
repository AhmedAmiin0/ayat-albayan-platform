import { describe, expect, it } from 'vitest';
import type { LineNumbers } from '../../../../config/env/env';
import { CHAT_PHONE_NUMBER_ID, PHONE_NUMBER_ID } from '../meta.fakes';
import { parseWebhook } from './webhook.parse';

// Meta Cloud API Calling payloads (field `calls`), as Kapso's meta-kind webhook forwards them raw.
const NOW = new Date('2026-10-26T10:00:00Z');
const TWO: LineNumbers = { notifications: PHONE_NUMBER_ID, chat: CHAT_PHONE_NUMBER_ID };
const change = (field: string, value: object) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'waba', changes: [{ field, value: { messaging_product: 'whatsapp', metadata: { phone_number_id: CHAT_PHONE_NUMBER_ID }, ...value } }] }],
});
const parse = (body: object) => parseWebhook(body, { now: NOW, numbers: TWO });

describe('parseWebhook — calls (docs/28)', () => {
  it('an inbound connect carries the family\'s offer', () => {
    const body = change('calls', {
      calls: [{ id: 'wacid.IN', from: '201001234567', to: '966536900446', event: 'connect', timestamp: '1793000000', direction: 'USER_INITIATED', session: { sdp_type: 'offer', sdp: 'v=0 offer' } }],
    });
    expect(parse(body).calls).toEqual([{
      kind: 'connect', waCallId: 'wacid.IN', phoneNumberId: CHAT_PHONE_NUMBER_ID, direction: 'inbound', peer: '201001234567',
      sdp: 'v=0 offer', ref: null, status: null, duration: null, at: new Date(1793000000 * 1000),
    }]);
  });

  it('our outbound call: the connect answer, its statuses and the terminate with our ref and Meta\'s talk time', () => {
    const body = change('calls', {
      calls: [
        { id: 'wacid.OUT', to: '201001234567', event: 'connect', direction: 'BUSINESS_INITIATED', session: { sdp_type: 'answer', sdp: 'v=0 a' }, biz_opaque_callback_data: 'ref-1' },
        { id: 'wacid.OUT', to: '201001234567', event: 'terminate', direction: 'BUSINESS_INITIATED', status: 'Completed', duration: 134, biz_opaque_callback_data: 'ref-1' },
      ],
      statuses: [{ id: 'wacid.OUT', type: 'call', status: 'RINGING', recipient_id: '201001234567', biz_opaque_callback_data: 'ref-1' }],
    });
    const calls = parse(body).calls ?? [];
    expect(calls.map((c) => [c.kind, c.direction, c.status, c.ref])).toEqual([
      ['connect', 'outbound', null, 'ref-1'],
      ['terminate', 'outbound', 'COMPLETED', 'ref-1'],
      ['status', 'outbound', 'RINGING', 'ref-1'],
    ]);
    expect(calls[0]?.sdp).toBe('v=0 a');
    expect(calls[1]?.duration).toBe(134);
  });

  it('a calls change never becomes a message or a delivery tick (no double ingest)', () => {
    const batch = parse(change('calls', { statuses: [{ id: 'wacid.OUT', type: 'call', status: 'ACCEPTED' }] }));
    expect(batch.messages).toEqual([]);
    expect(batch.statuses).toEqual([]);
    expect(batch.calls).toHaveLength(1);
  });

  it('skips items without an id or event, a non-call status, and another number\'s change', () => {
    const body = change('calls', { calls: [{ event: 'connect' }, { id: 'x', event: 'other' }], statuses: [{ id: 'w', type: 'message', status: 'sent' }] });
    expect(parse(body).calls).toEqual([]);
    const other = { entry: [{ changes: [{ field: 'calls', value: { metadata: { phone_number_id: 'someone' }, calls: [{ id: 'w', event: 'connect' }] } }] }] };
    expect(parse(other).calls).toBeUndefined();
  });

  it('a messages-only body keeps its old shape (no calls key)', () => {
    expect(parse(change('messages', { messages: [] }))).toEqual({ messages: [], statuses: [] });
  });
});
