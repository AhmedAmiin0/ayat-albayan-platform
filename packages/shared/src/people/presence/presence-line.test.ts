import { describe, expect, it } from 'vitest';
import ar from '../../../i18n/ar.json' with { type: 'json' };
import en from '../../../i18n/en.json' with { type: 'json' };
import { isOnline, lastMessageLine, PRESENCE_RECENT_MS, presenceLine } from './presence-line.js';

const NOW = new Date('2026-10-30T12:00:00Z');
const base = {
  now: NOW,
  tz: 'Asia/Riyadh',
  cycle: '24' as const,
  locale: 'ar' as const,
  words: ar.presence,
};
const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();

describe('isOnline', () => {
  it('follows the socket while it is live, whatever the last seen', () => {
    expect(isOnline({ live: true, present: true, lastSeenAt: null, now: NOW })).toBe(true);
    expect(isOnline({ live: true, present: false, lastSeenAt: ago(1_000), now: NOW })).toBe(false);
  });

  it('without a socket, counts a recent activity as online', () => {
    expect(
      isOnline({ live: false, present: false, lastSeenAt: ago(PRESENCE_RECENT_MS - 1), now: NOW }),
    ).toBe(true);
    expect(
      isOnline({ live: false, present: false, lastSeenAt: ago(PRESENCE_RECENT_MS), now: NOW }),
    ).toBe(false);
    expect(isOnline({ live: false, present: true, lastSeenAt: null, now: NOW })).toBe(false);
    expect(isOnline({ live: false, present: false, lastSeenAt: 'bad', now: NOW })).toBe(false);
  });
});

describe('presenceLine', () => {
  it('reads «متصل الآن» when online', () => {
    expect(presenceLine({ ...base, online: true, lastSeenAt: null })).toBe('متصل الآن');
    expect(
      presenceLine({ ...base, words: en.presence, locale: 'en', online: true, lastSeenAt: null }),
    ).toBe('Online now');
  });

  it('reads the last seen when offline, nothing when never seen', () => {
    expect(presenceLine({ ...base, online: false, lastSeenAt: ago(5 * 60_000) })).toBe(
      'آخر ظهور منذ 5 دقائق',
    );
    expect(presenceLine({ ...base, online: false, lastSeenAt: null })).toBe('');
  });
});

describe('lastMessageLine', () => {
  it('words the time since the last inbound message', () => {
    expect(lastMessageLine({ ...base, lastInboundAt: ago(3 * 60_000) })).toBe(
      'آخر رسالة منذ 3 دقائق',
    );
    expect(lastMessageLine({ ...base, lastInboundAt: '2026-10-29T08:00:00Z' })).toBe(
      'آخر رسالة أمس',
    );
    expect(
      lastMessageLine({ ...base, words: en.presence, locale: 'en', lastInboundAt: ago(1_000) }),
    ).toBe('Last message just now');
  });

  it('is empty when they never wrote', () => {
    expect(lastMessageLine({ ...base, lastInboundAt: null })).toBe('');
  });
});
