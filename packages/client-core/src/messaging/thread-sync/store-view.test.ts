import type { MessageStatus, MessageView, SyncMessage, ThreadDetail } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { furtherOf, storedStatus, withStoredRows, withStoredTicks } from './store-view.js';

const at = (s: number) => `2026-11-06T10:00:${String(s).padStart(2, '0')}.000000+00:00`;
const msg = (n: number, status: MessageStatus = 'sent'): MessageView =>
  ({ id: `m${n}`, status, created_at: at(n), sent_at: null, delivered_at: null, read_at: null }) as
    MessageView;
const synced = (n: number, status: MessageStatus = 'sent'): SyncMessage => ({
  ...msg(n, status),
  updated_at: at(n),
});
const page = (...messages: MessageView[]) => ({ messages }) as ThreadDetail;
const data = (...pages: ThreadDetail[]) => ({ pages, pageParams: pages.map(() => null) });

describe('withStoredTicks / withStoredRows: the chat over the phone store (docs/43 43-7)', () => {
  it('a stored tick further along lifts the page row on every page', () => {
    const d = data(page(msg(3), msg(4)), page(msg(1, 'delivered')));
    const out = withStoredTicks(d, [synced(4, 'read'), synced(1, 'read')]);
    expect(out.pages.map((p) => p.messages.map((m) => m.status))).toEqual([['sent', 'read'], ['read']]);
  });

  it('nothing to lift or add: the same object (no re-render)', () => {
    const d = data(page(msg(1, 'read'), msg(2)));
    expect(withStoredRows(d, [synced(1, 'sent')])).toBe(d);
    expect(withStoredRows(d, [])).toBe(d);
  });

  it('a stored row newer than the newest page joins it in time order; older unknown rows do not', () => {
    const d = data(page(msg(2), msg(5)), page(msg(1)));
    const out = withStoredRows(d, [synced(7), synced(6), synced(3)]);
    expect(out.pages[0]?.messages.map((m) => m.id)).toEqual(['m2', 'm5', 'm6', 'm7']);
    expect(out.pages[1]).toBe(d.pages[1]);
  });

  it('no page yet: unchanged (the screen shows the stored rows itself)', () => {
    const d = data();
    expect(withStoredRows(d, [synced(1)])).toBe(d);
  });
});

describe('storedStatus / furtherOf: a chats-list row tick from the stored rows', () => {
  const row = { phone_e164: '+1', last_message_id: 'm1', last_status: 'sent' as const };
  const threads = new Map([['+1', { ...row, last_status: 'read' as const }]]);

  it('the stored tick for the same last message only', () => {
    expect(storedStatus(threads)(row)).toBe('read');
    expect(storedStatus(threads)({ ...row, last_message_id: 'm2' })).toBeUndefined();
    expect(storedStatus(new Map())(row)).toBeUndefined();
  });

  it('the further along of two sources, either one alone, or none', () => {
    const is = (s: MessageStatus | undefined) => () => s;
    expect(furtherOf(is('delivered'), is('read'))(row)).toBe('read');
    expect(furtherOf(is('read'), is('delivered'))(row)).toBe('read');
    expect(furtherOf(is(undefined), is('read'))(row)).toBe('read');
    expect(furtherOf(is('sent'), is(undefined))(row)).toBe('sent');
    expect(furtherOf(is(undefined), is(undefined))(row)).toBeUndefined();
    expect(furtherOf(is('failed'), is('read'))(row)).toBe('failed');
  });
});
