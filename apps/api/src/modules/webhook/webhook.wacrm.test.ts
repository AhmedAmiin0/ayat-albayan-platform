import { describe, expect, it } from 'vitest';
import { parseWacrm, SeenDeliveries } from './webhook.wacrm';

// docs/19 «crm driver»: the CRM's delivery envelope and the dedupe on its id.

const NOW = new Date('2026-10-25T08:00:00Z');
const env = (event: string, data: unknown, over: Record<string, unknown> = {}) => ({ id: 'd-1', event, occurred_at: '2026-10-25T07:59:00.000Z', account_id: 'a', data, ...over });

describe('parseWacrm', () => {
  it('message.status_updated → a status event by wamid at occurred_at, without the CRM conversation id', () => {
    expect(parseWacrm(env('message.status_updated', { whatsapp_message_id: 'wamid.1', conversation_id: 'c', status: 'read' }), NOW)).toEqual({
      id: 'd-1',
      kind: 'status',
      status: { waMessageId: 'wamid.1', status: 'read', at: new Date('2026-10-25T07:59:00.000Z'), errorCode: null, errorText: null, conversationId: null, pricingCategory: null },
    });
  });

  it('message.received and other events are not statuses; an unknown status or a bad envelope too', () => {
    expect(parseWacrm(env('message.received', {}), NOW)).toEqual({ id: 'd-1', kind: 'received', event: 'message.received' });
    expect(parseWacrm(env('conversation.created', {}), NOW)).toMatchObject({ kind: 'other' });
    expect(parseWacrm(env('message.status_updated', { whatsapp_message_id: 'w', status: 'played' }), NOW)).toMatchObject({ kind: 'other' });
    expect(parseWacrm({ event: 'message.received' }, NOW)).toBeNull();
    expect(parseWacrm(env('message.status_updated', { whatsapp_message_id: 'w', status: 'sent' }, { occurred_at: 'soon' }), NOW)).toMatchObject({ status: { at: NOW } });
  });
});

describe('SeenDeliveries', () => {
  it('first time only within the window; forgotten ids and old ones count again', () => {
    const seen = new SeenDeliveries(1_000);
    expect(seen.first('a', 0)).toBe(true);
    expect(seen.first('a', 500)).toBe(false);
    seen.forget('a');
    expect(seen.first('a', 600)).toBe(true);
    expect(seen.first('a', 1_700)).toBe(true);
  });
});
