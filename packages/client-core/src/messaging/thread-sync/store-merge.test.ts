import type { MessageStatus, MessageView, SyncMessage } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { mergeRead, UNSYNCED_AT } from './store-merge.js';

const ID = 'c0000000-0000-4000-8000-000000000001';
const T = '2026-11-06T10:00:01.000001+00:00';
const view = (status: MessageStatus, over: Partial<MessageView> = {}) =>
  ({ id: ID, status, body: 'x', sent_at: null, delivered_at: null, read_at: null, ...over }) as
    MessageView;
const held = (status: MessageStatus, over: Partial<MessageView> = {}): SyncMessage => ({
  ...view(status, over),
  updated_at: T,
});

describe('mergeRead: a chat read over the stored row of the same id (docs/43 43-6)', () => {
  it('a row never held takes the unsynced stamp: the first sync copy replaces it', () => {
    expect(mergeRead(undefined, view('sent'))).toEqual({ ...view('sent'), updated_at: UNSYNCED_AT });
  });

  it('keeps the stored sync stamp, so a later sync still decides by it', () => {
    expect(mergeRead(held('sent'), view('delivered')).updated_at).toBe(T);
  });

  it('a further-along stored tick stays, with its stamps (an older read never undoes ✓✓)', () => {
    const read_at = '2026-11-06T10:05:00Z';
    const out = mergeRead(held('read', { read_at }), view('delivered', { body: 'edited' }));
    expect([out.status, out.read_at, out.body]).toEqual(['read', read_at, 'edited']);
  });

  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    ['queued', 'sent', 'sent'],
    ['sent', 'read', 'read'],
    ['failed', 'queued', 'queued'],
    ['failed', 'sent_manually', 'sent_manually'],
    ['read', 'failed', 'failed'],
  ])('stored %s, read %s → %s', (was, got, kept) => {
    expect(mergeRead(held(was), view(got)).status).toBe(kept);
  });
});
