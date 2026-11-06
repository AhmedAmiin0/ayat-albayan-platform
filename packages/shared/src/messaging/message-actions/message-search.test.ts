import { describe, expect, it } from 'vitest';
import { searchCursor, splitSearchCursor } from './chat-search.js';
import {
  messageSearchPageSchema,
  messageSearchQuerySchema,
  searchesMessages,
} from './message-search.js';

const ID = 'b1111111-1111-4111-8111-111111111111';
const AT = '2026-10-01T09:30:00.123456+00:00';

describe('messageSearchQuerySchema', () => {
  it('needs 3 folded characters: tashkeel and outer spaces do not count', () => {
    expect(messageSearchQuerySchema.safeParse({ q: 'اَبْ' }).success).toBe(false);
    expect(messageSearchQuerySchema.safeParse({ q: '  اَلْ  ' }).success).toBe(false);
    expect(messageSearchQuerySchema.safeParse({ q: 'درس' }).success).toBe(true);
    expect(searchesMessages('مُدَ')).toBe(false);
    expect(searchesMessages('مدر')).toBe(true);
  });

  it('refuses more than 100 characters and a malformed cursor', () => {
    expect(messageSearchQuerySchema.safeParse({ q: 'a'.repeat(101) }).success).toBe(false);
    expect(messageSearchQuerySchema.safeParse({ q: 'abc', cursor: 'x_y' }).success).toBe(false);
    const cursor = `${AT}_${ID}`;
    expect(messageSearchQuerySchema.parse({ q: ' abc ', cursor })).toEqual({ q: 'abc', cursor });
  });
});

describe('splitSearchCursor', () => {
  it('keeps the raw time with its microseconds and the id', () => {
    const cursor = searchCursor({ id: ID, created_at: AT });
    expect(splitSearchCursor(cursor)).toEqual({ at: AT, id: ID });
  });
});

describe('messageSearchPageSchema', () => {
  it('parses hits with their chat and refuses a hit without a phone', () => {
    const hit = { id: ID, created_at: AT, snippet: 's', phone_e164: '+966500000001', display_name: null };
    const page = messageSearchPageSchema.parse({ items: [hit], next_cursor: null });
    expect(page.items[0]?.phone_e164).toBe('+966500000001');
    const bad = { items: [{ ...hit, phone_e164: 'x' }], next_cursor: null };
    expect(messageSearchPageSchema.safeParse(bad).success).toBe(false);
  });
});
