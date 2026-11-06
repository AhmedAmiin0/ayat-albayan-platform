import { describe, expect, it } from 'vitest';
import { provisionalMessage, touchedThread } from './provisional.js';
import {
  appendMessage,
  leavesGap,
  mergeNewest,
  removeMessage,
  replaceMessage,
} from './thread-edits.js';
import { cache, ids, msg, page, PHONE } from './thread.fakes.test-util.js';

const temp = msg(9, { id: 'tmp', status: 'queued' });
const server = msg(9, { id: 's9', status: 'queued' });

describe('an optimistic send', () => {
  it('appends to the end of the newest page only', () => {
    const data = cache(page([msg(5)]), page([msg(1)]));
    expect(ids(appendMessage(data, temp))).toEqual([['m5', 'tmp'], ['m1']]);
    expect(appendMessage(undefined, temp)).toBeUndefined();
  });

  it('the server row replaces the provisional one in place', () => {
    const data = cache(page([msg(5), temp]));
    expect(ids(replaceMessage(data, 'tmp', server))).toEqual([['m5', 's9']]);
    expect(replaceMessage(undefined, 'tmp', server)).toBeUndefined();
  });

  it('no double row when a refresh brought the server row in first', () => {
    const data = cache(page([msg(5), temp, server]));
    expect(ids(replaceMessage(data, 'tmp', server))).toEqual([['m5', 's9']]);
  });

  it('a refused send is rolled back', () => {
    expect(ids(removeMessage(cache(page([msg(5), temp])), 'tmp'))).toEqual([['m5']]);
  });
});

describe('mergeNewest: a fresh newest page', () => {
  it('joins pages[0]; older pages stay the same objects', () => {
    const data = cache(page([msg(4), msg(5)], true), page([msg(1)]));
    const next = mergeNewest(data, page([msg(5), msg(6)], true));
    expect(ids(next)).toEqual([['m4', 'm5', 'm6'], ['m1']]);
    expect(next?.pages[1]).toBe(data.pages[1]);
    expect(next?.pages[0]?.has_more).toBe(true);
  });

  it('its rows win; a provisional row still sending stays after them', () => {
    const data = cache(page([msg(5, { status: 'sent' }), temp]));
    const next = mergeNewest(data, page([msg(5), msg(6)]));
    expect(ids(next)).toEqual([['m5', 'm6', 'tmp']]);
    expect(next?.pages[0]?.messages[0]?.status).toBe('delivered');
    expect(ids(mergeNewest(data, page([])))).toEqual([['m5', 'tmp']]);
    expect(mergeNewest(undefined, page([]))).toBeUndefined();
  });

  it('a gap is a fresh page with more behind it and nothing in common', () => {
    const data = cache(page([msg(1)]));
    expect(leavesGap(data, page([msg(7)], true))).toBe(true);
    expect(leavesGap(data, page([msg(1), msg(7)], true))).toBe(false);
    expect(leavesGap(data, page([msg(7)]))).toBe(false);
    expect(leavesGap(undefined, page([msg(7)], true))).toBe(false);
  });
});

describe('rows a send shows at once', () => {
  it('a provisional row is our queued text with no wa.me link', () => {
    const now = new Date('2026-11-06T10:00:00Z');
    const row = provisionalMessage({ id: 'r1', phone: PHONE, body: 'مرحبا', templateKey: 'x', now });
    expect(row).toMatchObject({ id: 'r1', direction: 'outbound', status: 'queued', template_key: 'x' });
    expect(row.created_at).toBe(now.toISOString());
    expect(provisionalMessage({ id: 'r2', phone: PHONE, body: 'x' }).template_key).toBeNull();
  });

  it('the list row takes the sent row as its last message', () => {
    const th = page([]).thread;
    expect(th && touchedThread(th, temp)).toMatchObject({
      last_message_id: 'tmp',
      last_status: 'queued',
      last_direction: 'outbound',
      last_unsupported: false,
    });
  });
});
