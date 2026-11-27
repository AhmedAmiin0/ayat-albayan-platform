import { describe, expect, it } from 'vitest';
import { inboxSearchRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const CURSOR = `2026-10-01T09:30:00.123456+00:00_${ID}`;
const HIT = { id: ID, created_at: '2026-10-01T09:30:00.123456+00:00', snippet: 'درس' };

describe('inboxSearchRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /threads/search', 'GET /threads/:phone/search']);
  });

  it('asks the global search from three folded characters, with a cursor or none', () => {
    expect(routes.messages.query.parse({ q: 'درس', cursor: CURSOR })).toEqual({
      q: 'درس',
      cursor: CURSOR,
    });
    expect(routes.messages.query.safeParse({ q: 'اَبْ' }).success).toBe(false);
    expect(routes.messages.query.safeParse({ q: 'درس', cursor: 'x' }).success).toBe(false);
  });

  it('answers the global search with each hit and its chat, no total', () => {
    const hit = { ...HIT, phone_e164: '+966500000001', display_name: null };
    const page = { items: [hit], next_cursor: null };
    expect(routes.messages.response.parse(page)).toEqual(page);
    const bad = { items: [{ ...hit, phone_e164: 'unknown' }], next_cursor: null };
    expect(routes.messages.response.safeParse(bad).success).toBe(false);
  });

  it('asks one chat by its E.164 number with the words trimmed', () => {
    expect(routes.chat.params.parse({ phone: '+966500000001' })).toEqual({ phone: '+966500000001' });
    expect(routes.chat.params.safeParse({ phone: 'abc' }).success).toBe(false);
    expect(routes.chat.query.parse({ q: '  درس ' })).toEqual({ q: 'درس' });
    expect(routes.chat.query.safeParse({ q: '  ' }).success).toBe(false);
  });

  it('answers one chat with its hits, the total and the next cursor', () => {
    const page = { items: [HIT], total: 1, next_cursor: CURSOR };
    expect(routes.chat.response.parse(page)).toEqual(page);
    expect(routes.chat.response.safeParse({ items: [HIT], next_cursor: null }).success).toBe(false);
  });
});
