import { describe, expect, it } from 'vitest';
import { appSendMatches, appSendSpan, attachPatch, foldText } from './manual-echo';
import { CHAT, row, SENT_AT } from './manual-echo.fixtures.test-util';

// The pure rules of the «أرسل عبر واتساب» attach (docs/19): which row an external text confirms.

const BODY = 'السلام عليكم موعد الحلقة غدًا';
const event = (status: 'sent' | 'delivered' | 'read' | 'failed') => ({
  waMessageId: 'wamid.APP1',
  status,
  at: new Date('2026-11-06T10:06:00Z'),
  errorCode: null,
  errorText: null,
  conversationId: null,
  pricingCategory: null,
});

describe('app send attach rules', () => {
  it('folds runs of whitespace and line breaks', () => {
    expect(foldText('  a \n\n b\tc ')).toBe('a b c');
  });

  it('the span: a window that ended up to 5 min before, or opened up to 5 min after', () => {
    expect(appSendSpan(SENT_AT)).toEqual({
      since: new Date('2026-11-06T10:00:00Z'),
      until: new Date('2026-11-06T10:20:00Z'),
    });
  });

  it('never another text, line or number; an unknown line or number does not block', () => {
    const rows = [
      row({ id: 'other-text', body: 'نص آخر' }),
      row({ id: 'other-line', line: 'notifications' }),
      row({ id: 'other-number', number_id: 'num-2' }),
      row({ id: 'unrouted', line: null, number_id: null }),
    ];
    expect(appSendMatches(rows, { body: BODY, from: CHAT }).map((r) => r.id)).toEqual(['unrouted']);
  });

  it('an empty text never matches', () => {
    expect(appSendMatches([row({ body: '  ' })], { body: ' ', from: CHAT })).toEqual([]);
  });

  it('earliest window first', () => {
    const rows = [row({ id: 'late', app_send_until: '2026-11-06T10:12:00Z' }), row({ id: 'early' })];
    expect(appSendMatches(rows, { body: BODY, from: CHAT })[0]?.id).toBe('early');
  });

  it('status: sent for an echo; the event as it says; never on a failed one', () => {
    expect(attachPatch(SENT_AT)).toEqual({ status: 'sent', sent_at: SENT_AT.toISOString() });
    expect(attachPatch(SENT_AT, event('delivered'))).toMatchObject({
      status: 'delivered',
      delivered_at: '2026-11-06T10:06:00.000Z',
    });
    expect(attachPatch(SENT_AT, event('read'))).toMatchObject({
      status: 'read',
      delivered_at: '2026-11-06T10:06:00.000Z',
      read_at: '2026-11-06T10:06:00.000Z',
    });
    expect(attachPatch(SENT_AT, event('failed'))).toBeNull();
  });
});
