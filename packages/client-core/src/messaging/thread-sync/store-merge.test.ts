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

  it('a synced row keeps its fields and stamp; a read only lifts its tick', () => {
    const out = mergeRead(held('sent', { body: 'synced' }), view('delivered', { body: 'old read' }));
    expect([out.status, out.body, out.updated_at]).toEqual(['delivered', 'synced', T]);
  });

  it('a further-along stored tick stays, with its stamps (an older read never undoes ✓✓)', () => {
    const read_at = '2026-11-06T10:05:00Z';
    const out = mergeRead(held('read', { read_at }), view('delivered'));
    expect([out.status, out.read_at]).toEqual(['read', read_at]);
  });

  it('a row held only from reads takes the newer read, the tick by rank', () => {
    const unsynced = { ...view('read'), updated_at: UNSYNCED_AT };
    const out = mergeRead(unsynced, view('delivered', { body: 'edited' }));
    expect([out.status, out.body, out.updated_at]).toEqual(['read', 'edited', UNSYNCED_AT]);
  });

  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    ['queued', 'sent', 'sent'],
    ['sent', 'read', 'read'],
    ['failed', 'queued', 'queued'],
    ['failed', 'sent_manually', 'sent_manually'],
    ['read', 'failed', 'failed'],
  ])('held from reads %s, read %s → %s', (was, got, kept) => {
    expect(mergeRead({ ...held(was), updated_at: UNSYNCED_AT }, view(got)).status).toBe(kept);
  });

  it('a synced failed row stays failed over a read: its next sync brings the retry', () => {
    expect(mergeRead(held('failed'), view('queued')).status).toBe('failed');
  });
});
