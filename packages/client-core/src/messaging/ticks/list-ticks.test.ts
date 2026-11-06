import type { MessageStatus, MessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { chatStatus, overlayPage, overlayPages, overlayTicks, type TickRow } from './list-ticks.js';

const row = (phone: string, id: string, last_status: MessageStatus): TickRow => ({
  phone_e164: phone,
  last_message_id: id,
  last_status,
});
const msg = (id: string, status: MessageStatus) => ({ id, status }) as MessageView;
const chats: Record<string, MessageStatus> = { m1: 'sent', m2: 'read', m3: 'queued', m4: 'failed' };
const statusOf = (r: TickRow) => chats[r.last_message_id];

describe('chatStatus: the status a chat cache holds for one message', () => {
  it('finds the id on any page, the newest page first', () => {
    const cache = { pages: [{ messages: [msg('x', 'read')] }, { messages: [msg('y', 'sent'), msg('x', 'sent')] }] };
    expect(chatStatus(cache, 'x')).toBe('read');
    expect(chatStatus(cache, 'y')).toBe('sent');
  });

  it('is undefined for an unknown id or no cache', () => {
    expect(chatStatus({ pages: [{ messages: [] }] }, 'x')).toBeUndefined();
    expect(chatStatus(undefined, 'x')).toBeUndefined();
  });
});

describe('overlayTicks: the list row follows the chat (docs/43 §2, the owner\'s pending tick)', () => {
  it('lifts a queued row to the chat\'s ✓ and a ✓ row to ✓✓', () => {
    const out = overlayTicks([row('+1', 'm1', 'queued'), row('+2', 'm2', 'delivered')], statusOf);
    expect(out.map((r) => r.last_status)).toEqual(['sent', 'read']);
  });

  it('never lowers a row, never takes failed over it, ignores chats not loaded', () => {
    const items = [row('+1', 'm1', 'read'), row('+3', 'm3', 'sent'), row('+4', 'm4', 'queued'), row('+5', 'm9', 'queued')];
    expect(overlayTicks(items, statusOf)).toBe(items);
  });

  it('keeps unchanged rows by reference', () => {
    const still = row('+3', 'm3', 'sent');
    const out = overlayTicks([row('+1', 'm1', 'queued'), still], statusOf);
    expect(out[1]).toBe(still);
  });
});

describe('overlayPage / overlayPages: whole list caches', () => {
  const pageOf = (...items: TickRow[]) => ({ items, total: items.length });

  it('returns the same page and cache when no tick moves', () => {
    const page = pageOf(row('+1', 'm1', 'sent'));
    expect(overlayPage(page, statusOf)).toBe(page);
    const data = { pages: [page], pageParams: [1] };
    expect(overlayPages(data, statusOf)).toBe(data);
  });

  it('copies only the page that moves; other fields stay', () => {
    const still = pageOf(row('+2', 'm2', 'read'));
    const data = { pages: [pageOf(row('+1', 'm1', 'queued')), still], pageParams: [1, 2] };
    const out = overlayPages(data, statusOf);
    expect(out.pages[0]?.items[0]?.last_status).toBe('sent');
    expect(out.pages[0]?.total).toBe(1);
    expect(out.pages[1]).toBe(still);
    expect(out.pageParams).toBe(data.pageParams);
  });
});
