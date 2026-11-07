import type { MessageStatus, MessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { applyLiveRows, liveEvent, type LiveRow, patchChat, patchList } from './live-rows.js';

const PHONE = '+966500000001';
const row = (id: string, s: MessageStatus): LiveRow => ({
  id,
  s,
  d: 'outbound',
  at: '2026-11-07T10:00:00Z',
});
const msg = (id: string, status: MessageStatus) => ({ id, status, body: id }) as MessageView;
const held = (map: Record<string, MessageStatus>) => (id: string) => map[id];

describe('liveEvent: the payload, parsed (zod)', () => {
  it('keeps the phone and the rows', () => {
    const rows = [row('a', 'sent')];
    expect(liveEvent({ phone: PHONE, rows })).toEqual({ phone: PHONE, rows });
  });

  it('a {phone}-only event, or rows that do not parse, is the phone alone', () => {
    expect(liveEvent({ phone: PHONE })).toEqual({ phone: PHONE });
    expect(liveEvent({ phone: PHONE, rows: [{ id: 'a', s: 'bogus' }] })).toEqual({ phone: PHONE });
    expect(liveEvent({ phone: PHONE, rows: [] })).toEqual({ phone: PHONE });
    const many = Array.from({ length: 21 }, (_, i) => row(String(i), 'sent'));
    expect(liveEvent({ phone: PHONE, rows: many })).toEqual({ phone: PHONE });
  });

  it('no valid phone: nothing', () => {
    expect(liveEvent({ phone: '0500' })).toBeNull();
    expect(liveEvent(null)).toBeNull();
    expect(liveEvent({ rows: [row('a', 'sent')] })).toBeNull();
  });
});

describe('applyLiveRows: tick moves of the open chat settle, everything else re-reads', () => {
  it('complete when every row is an outbound tick the open chat holds', () => {
    const out = applyLiveRows(
      [row('a', 'sent'), row('b', 'read')],
      held({ a: 'queued', b: 'sent' }),
    );
    expect(out.complete).toBe(true);
    expect([...out.incoming]).toEqual([
      ['a', 'sent'],
      ['b', 'read'],
    ]);
  });

  it('a row the chat does not show (a new message) re-reads; every row still patches', () => {
    const out = applyLiveRows([row('a', 'delivered'), row('new', 'sent')], held({ a: 'sent' }));
    expect(out.complete).toBe(false);
    expect([...out.incoming]).toEqual([
      ['a', 'delivered'],
      ['new', 'sent'],
    ]);
  });

  it('an inbound row re-reads even when already held (a list/sync read landed it first)', () => {
    const inbound: LiveRow = { ...row('m', 'delivered'), d: 'inbound' };
    expect(applyLiveRows([inbound], held({ m: 'delivered' })).complete).toBe(false);
  });

  it('a queued row (insert, or a retry of a failed one) re-reads even when held', () => {
    expect(applyLiveRows([row('a', 'queued')], held({ a: 'failed' })).complete).toBe(false);
  });

  it('no rows: incomplete, nothing to move', () => {
    expect(applyLiveRows(undefined, held({}))).toEqual({ incoming: new Map(), complete: false });
    expect(applyLiveRows([], held({})).complete).toBe(false);
  });
});

describe('patchChat / patchList: laterStatus ordering', () => {
  const chat = (...messages: MessageView[]) => ({ pages: [{ messages, has_more: false }] });

  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    ['queued', 'sent', 'sent'],
    ['sent', 'delivered', 'delivered'],
    ['read', 'delivered', 'read'],
    ['delivered', 'sent', 'delivered'],
    ['read', 'failed', 'failed'],
    ['failed', 'sent_manually', 'sent_manually'],
    ['failed', 'queued', 'queued'],
  ])('held %s, incoming %s → %s', (cached, incoming, kept) => {
    const data = chat(msg('a', cached), msg('b', 'queued'));
    const out = patchChat(data, new Map([['a', incoming]]));
    expect(out.pages[0]?.messages.map((m) => m.status)).toEqual([kept, 'queued']);
    const list = { items: [{ phone_e164: PHONE, last_message_id: 'a', last_status: cached }] };
    expect(patchList(list, new Map([['a', incoming]])).items[0]?.last_status).toBe(kept);
  });

  it('the same objects when no tick moves (no re-render)', () => {
    const data = chat(msg('a', 'read'));
    expect(patchChat(data, new Map([['a', 'delivered']]))).toBe(data);
    expect(patchChat(data, new Map([['zz', 'read']]))).toBe(data);
    const list = {
      items: [{ phone_e164: PHONE, last_message_id: 'a', last_status: 'read' as const }],
    };
    expect(patchList(list, new Map([['a', 'sent']]))).toBe(list);
  });
});
