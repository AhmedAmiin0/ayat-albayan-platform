import { describe, expect, it } from 'vitest';
import {
  mergeListHead,
  moveToTop,
  patchListPages,
  replaceListRow,
  withStoredThreads,
} from './list-cache';
import { listCache, listPage, listRow, msg, phones } from '../thread.fakes.test-util';

const A = '+201000000001';
const B = '+201000000002';
const C = '+201000000003';
const D = '+201000000004';

describe('moveToTop: rows on top of the newest page', () => {
  it('takes the rows out of every page and puts them first on page 1', () => {
    const data = listCache(4, [listRow(A, 4), listRow(B, 3)], [listRow(C, 2), listRow(D, 1)]);
    const out = moveToTop(data, [listRow(D, 9)]);
    expect(phones(out)).toEqual([[D, A, B], [C]]);
    expect(out.pages[0]?.items[0]?.last_message_id).toBe('m9');
  });

  it('is the same object with no row to move', () => {
    const data = listCache(1, [listRow(A, 1)]);
    expect(moveToTop(data, [])).toBe(data);
  });
});

describe('withStoredThreads: the phone store ahead of the cached list', () => {
  it('lifts a newer stored row to the top with its preview, unread and tick', () => {
    const data = listCache(3, [listRow(A, 3), listRow(B, 2)], [listRow(C, 1)]);
    const held = listRow(C, 5, { last_body: 'new', unread_count: 2, last_status: 'read' });
    const out = withStoredThreads(data, new Map([[C, held]]));
    expect(phones(out)).toEqual([[C, A, B], []]);
    const top = out.pages[0]?.items[0];
    expect([top?.last_body, top?.unread_count, top?.last_status]).toEqual(['new', 2, 'read']);
    expect(top?.last_message_id).toBe('m5');
  });

  it('keeps the newest of several lifted rows first', () => {
    const data = listCache(3, [listRow(A, 3), listRow(B, 2), listRow(C, 1)]);
    const stored = new Map([
      [B, listRow(B, 6)],
      [C, listRow(C, 7)],
    ]);
    expect(phones(withStoredThreads(data, stored))).toEqual([[C, B, A]]);
  });

  it('ignores a stored row that is older or as old, and a phone the list does not hold', () => {
    const data = listCache(2, [listRow(A, 3), listRow(B, 2)]);
    const stored = new Map([
      [A, listRow(A, 1, { unread_count: 9 })],
      [B, listRow(B, 2, { unread_count: 9 })],
      [D, listRow(D, 8)],
    ]);
    expect(withStoredThreads(data, stored)).toBe(data);
  });
});

describe('mergeListHead: page 1 read again, merged into the cached pages', () => {
  const fresh = (...items: ReturnType<typeof listRow>[]) => listPage(30, items);

  it('takes the fresh page 1 in its order and leaves the other pages untouched', () => {
    const data = listCache(30, [listRow(A, 3), listRow(B, 2)], [listRow(C, 1)]);
    const out = mergeListHead(data, fresh(listRow(C, 9), listRow(A, 3)));
    expect(phones(out)).toEqual([[C, A, B], [C]]);
    expect(out?.pages[1]).toBe(data.pages[1]);
    expect(out?.pages[0]?.items[0]?.last_message_id).toBe('m9');
  });

  it('keeps a row the fresh page pushed down, once, after the fresh rows (no duplicate)', () => {
    const data = listCache(30, [listRow(A, 3), listRow(B, 2), listRow(D, 1)], [listRow(B, 2)]);
    const out = mergeListHead(data, fresh(listRow(C, 9), listRow(A, 3)));
    expect(phones(out)).toEqual([[C, A, D], [B]]);
  });

  it('is null when the fresh full page shares no row with the cache (a gap: read all)', () => {
    const data = listCache(30, [listRow(A, 1)]);
    expect(mergeListHead(data, fresh(listRow(C, 9), listRow(D, 8)))).toBeNull();
  });

  it('takes a fresh page that holds the whole list as it is, even without overlap', () => {
    const data = listCache(1, [listRow(A, 1)]);
    const whole = listPage(1, [listRow(C, 9)]);
    expect(phones(mergeListHead(data, whole))).toEqual([[C]]);
  });

  it('leaves no cache as no cache', () => {
    expect(mergeListHead(undefined, fresh(listRow(A, 1)))).toBeUndefined();
  });
});

describe('replaceListRow: the API row in place of the provisional send', () => {
  it("takes the server's id, status and time on every page", () => {
    const data = listCache(2, [listRow(A, 1, { last_message_id: 'tmp', last_status: 'queued' })]);
    const row = msg(4, { id: 'srv', status: 'sent', phone_e164: A });
    const top = replaceListRow(data, 'tmp', row)?.pages[0]?.items[0];
    expect([top?.last_message_id, top?.last_status]).toEqual(['srv', 'sent']);
    expect(top?.last_message_at).toBe(row.created_at);
  });

  it('is the same object when no row holds the provisional id', () => {
    const data = listCache(1, [listRow(A, 1)]);
    expect(replaceListRow(data, 'tmp', msg(2, { id: 'srv' }))).toBe(data);
    expect(replaceListRow(undefined, 'tmp', msg(2))).toBeUndefined();
  });
});

describe('patchListPages: an event moves the cached ticks at once', () => {
  it('moves the matching last message forward on every page, never back', () => {
    const data = listCache(2, [listRow(A, 1, { last_status: 'sent' })], [listRow(B, 2)]);
    const incoming = new Map([
      ['m1', 'read' as const],
      ['m2', 'sent' as const],
    ]);
    const out = patchListPages(data, incoming);
    expect(out.pages[0]?.items[0]?.last_status).toBe('read');
    expect(out.pages[1]).toBe(data.pages[1]);
  });

  it('is the same object when no tick moves', () => {
    const data = listCache(1, [listRow(A, 1)]);
    expect(patchListPages(data, new Map([['zz', 'read' as const]]))).toBe(data);
  });
});
