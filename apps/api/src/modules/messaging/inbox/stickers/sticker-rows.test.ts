import { describe, expect, it } from 'vitest';
import { favouriteItems, recentItems, RECENT_MAX, sendable } from './sticker-rows';
import type { StickerRow } from './sticker.repo';

// The sticker panel's lists (owner 2026-11-01).
const NOW = new Date('2026-11-01T12:00:00Z');
const row = (id: string, over: Partial<StickerRow> = {}): StickerRow => ({
  id,
  phone_e164: '+966500000001',
  direction: 'inbound',
  media_id: `wa-${id}`,
  media_path: null,
  created_at: '2026-10-31T12:00:00Z',
  interactive_payload: { type: 'sticker', sticker: { sha256: `sha-${id}` } },
  ...over,
});

describe('sendable', () => {
  it('a stored copy always; WhatsApp’s file only while it keeps it (29 days)', () => {
    expect(sendable(row('a', { media_path: 'out/x/y/s.webp', media_id: null }), NOW)).toBe(true);
    expect(sendable(row('a'), NOW)).toBe(true);
    expect(sendable(row('a', { created_at: '2026-09-01T12:00:00Z' }), NOW)).toBe(false);
    expect(sendable(row('a', { media_id: null }), NOW)).toBe(false);
  });
});

describe('recentItems', () => {
  it('newest first, one per sticker (its sha256), the unsendable left out', () => {
    const same = { interactive_payload: { type: 'sticker', sticker: { sha256: 'sha-a' } } };
    const rows = [row('a'), row('b', { media_id: null }), row('c', same), row('d')];
    expect(recentItems(rows, NOW).map((i) => i.message_id)).toEqual(['a', 'd']);
    expect(recentItems(rows, NOW)[0]).toEqual({ message_id: 'a', phone: '+966500000001', key: 'sha:sha-a' });
  });

  it('keeps at most RECENT_MAX', () => {
    const many = Array.from({ length: RECENT_MAX + 5 }, (_, i) => row(`m${i}`));
    expect(recentItems(many, NOW)).toHaveLength(RECENT_MAX);
  });
});

describe('favouriteItems', () => {
  it('in their own order, through the message holding each; a gone or hidden one drops out', () => {
    const favourites = [
      { profile_id: 'p', sticker_key: 'sha:sha-b', message_id: 'b' },
      { profile_id: 'p', sticker_key: 'sha:gone', message_id: 'gone' },
      { profile_id: 'p', sticker_key: 'sha:sha-a', message_id: 'a' },
    ];
    const items = favouriteItems(favourites, { rows: [row('a'), row('b')], now: NOW });
    expect(items.map((i) => [i.message_id, i.key])).toEqual([['b', 'sha:sha-b'], ['a', 'sha:sha-a']]);
  });
});
