import { describe, expect, it } from 'vitest';
import {
  hashLinkToken,
  linkExpiry,
  looksLikeLinkToken,
  newLinkToken,
} from '@/modules/teaching/classroom/join/join-link.token';

describe('newLinkToken', () => {
  it('is 32 URL-safe characters, short enough for a path parameter and a WhatsApp button', () => {
    const t = newLinkToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(looksLikeLinkToken(t)).toBe(true);
  });

  it('never repeats', () => {
    expect(new Set(Array.from({ length: 1000 }, newLinkToken)).size).toBe(1000);
  });

  it.each(['', 'short', 'x'.repeat(33), `${'a'.repeat(31)}!`, `${'a'.repeat(31)}.`])(
    'refuses %j before any lookup',
    (t) => {
      expect(looksLikeLinkToken(t)).toBe(false);
    },
  );
});

describe('hashLinkToken', () => {
  it('is the sha256 hex of the token, stable, and not the token', () => {
    const h = hashLinkToken('abc');
    expect(h).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hashLinkToken('abc')).toBe(h);
    expect(hashLinkToken('abd')).not.toBe(h);
  });
});

describe('linkExpiry', () => {
  it('a link dies 2 hours after the lesson ends', () => {
    expect(linkExpiry({ ends_at: '2026-10-05T17:00:00.000Z' })).toBe('2026-10-05T19:00:00.000Z');
  });
});
