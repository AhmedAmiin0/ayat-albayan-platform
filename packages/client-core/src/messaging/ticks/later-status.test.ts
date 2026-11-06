import { MESSAGE_STATUSES, type MessageStatus, type MessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { laterStatus, laterTick, laterTicks, ranksAbove } from './later-status.js';

const msg = (id: string, status: MessageStatus, over: Partial<MessageView> = {}) =>
  ({ id, status, body: id, sent_at: null, delivered_at: null, read_at: null, ...over }) as
    MessageView;

describe('laterStatus: one id never goes back along queued < sent < delivered < read', () => {
  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    ['queued', 'sent', 'sent'],
    ['sent', 'queued', 'sent'],
    ['delivered', 'sent', 'delivered'],
    ['read', 'delivered', 'read'],
    ['read', 'queued', 'read'],
    ['sent', 'read', 'read'],
    ['delivered', 'delivered', 'delivered'],
  ])('cached %s, incoming %s → %s', (cached, incoming, kept) => {
    expect(laterStatus(cached, incoming)).toBe(kept);
  });

  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    // the server moves failed/held → queued (retry, reopen) and failed → sent_manually on purpose
    ['failed', 'queued', 'queued'],
    ['failed', 'sent_manually', 'sent_manually'],
    ['sent_manually', 'queued', 'queued'],
    // an answer naming failed or sent_manually always wins
    ['read', 'failed', 'failed'],
    ['delivered', 'sent_manually', 'sent_manually'],
    ['queued', 'failed', 'failed'],
  ])('unranked: cached %s, incoming %s → %s', (cached, incoming, kept) => {
    expect(laterStatus(cached, incoming)).toBe(kept);
  });

  it('ranks only the four ranked statuses, never itself', () => {
    for (const s of MESSAGE_STATUSES) expect(ranksAbove(s, s)).toBe(false);
    expect(ranksAbove('read', 'queued')).toBe(true);
    expect(ranksAbove('failed', 'queued')).toBe(false);
    expect(ranksAbove('read', 'sent_manually')).toBe(false);
  });
});

describe('laterTick: one row of a fresh read against the cached row', () => {
  it('keeps the cached tick and its stamps when further along; the rest is fresh', () => {
    const cached = msg('a', 'read', { delivered_at: 'd', read_at: 'r', body: 'old' });
    const out = laterTick(cached, msg('a', 'sent', { sent_at: 's', body: 'new' }));
    expect(out).toMatchObject({ status: 'read', delivered_at: 'd', read_at: 'r', body: 'new' });
  });

  it('returns the fresh row itself when it is not behind or nothing is cached', () => {
    const fresh = msg('a', 'delivered');
    expect(laterTick(undefined, fresh)).toBe(fresh);
    expect(laterTick(msg('a', 'sent'), fresh)).toBe(fresh);
    const retried = msg('a', 'queued');
    expect(laterTick(msg('a', 'failed'), retried)).toBe(retried);
  });
});

describe('laterTicks: a page poll that started before a delta brought ✓✓ (docs/43 AU12)', () => {
  const page = (...messages: MessageView[]) => ({ messages, has_more: false });

  it('keeps ✓✓ from any cached page; a row the cache lacks stays as read', () => {
    const cache = { pages: [page(msg('b', 'read')), page(msg('a', 'delivered'))] };
    const fresh = page(msg('a', 'sent'), msg('b', 'delivered'), msg('c', 'queued'));
    const out = laterTicks(cache, fresh);
    expect(out.messages.map((m) => m.status)).toEqual(['delivered', 'read', 'queued']);
    expect(out.has_more).toBe(false);
  });

  it('returns the fresh page itself when nothing is behind, or with no cache', () => {
    const fresh = page(msg('a', 'read'));
    expect(laterTicks({ pages: [page(msg('a', 'sent'))] }, fresh)).toBe(fresh);
    expect(laterTicks(undefined, fresh)).toBe(fresh);
  });
});
