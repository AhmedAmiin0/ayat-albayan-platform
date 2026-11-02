import { describe, expect, it } from 'vitest';
import {
  chatSearchQuerySchema,
  messageMatches,
  parseSearchCursor,
  searchCursor,
  searchFold,
} from './chat-search.js';

const ID = 'b1111111-1111-4111-8111-111111111111';

describe('searchFold / messageMatches', () => {
  it('hamza forms, taa marbuta, alef maqsura and tashkeel fold away', () => {
    expect(messageMatches(['درس الإسلام اليوم'], 'اسلام')).toBe(true);
    expect(messageMatches(['اسلام'], 'إسلام')).toBe(true);
    expect(messageMatches(['المدرسة قريبة'], 'مدرسه')).toBe(true);
    expect(messageMatches(['مدرسه'], 'مدرسة')).toBe(true);
    expect(messageMatches(['مُصْطَفَى'], 'مصطفي')).toBe(true);
  });

  it('Latin is case-insensitive and digits match in any script', () => {
    expect(messageMatches(['Zoom LINK'], 'zoom link')).toBe(true);
    expect(messageMatches(['الحلقة ١٢ اليوم'], '12')).toBe(true);
    expect(messageMatches(['page 12'], '١٢')).toBe(true);
    expect(searchFold('۳ أيام')).toBe('3 ايام');
  });

  it('any of the texts (body, document name) counts; null and a blank query never match', () => {
    expect(messageMatches([null, 'خطة الحفظ.pdf'], 'خطه')).toBe(true);
    expect(messageMatches([null, null], 'خطه')).toBe(false);
    expect(messageMatches(['السلام'], '   ')).toBe(false);
    expect(messageMatches(['السلام'], 'مرحبا')).toBe(false);
  });
});

describe('chatSearchQuerySchema', () => {
  it('trims q, refuses a blank or very long one', () => {
    expect(chatSearchQuerySchema.parse({ q: '  درس ' })).toEqual({ q: 'درس' });
    expect(chatSearchQuerySchema.safeParse({ q: '  ' }).success).toBe(false);
    expect(chatSearchQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
  });

  it('accepts only a well-formed cursor (no filter text can ride in it)', () => {
    const cursor = searchCursor({ id: ID, created_at: '2026-11-01T10:00:00.123456+00:00' });
    expect(chatSearchQuerySchema.parse({ q: 'a', cursor }).cursor).toBe(cursor);
    for (const bad of ['x', `2026-11-01T10:00:00Z_${ID},id.eq.1`, '%_%']) {
      expect(chatSearchQuerySchema.safeParse({ q: 'a', cursor: bad }).success).toBe(false);
    }
  });

  it('a cursor reads back as its time and id', () => {
    const at = '2026-11-01T10:00:00.000Z';
    expect(parseSearchCursor(searchCursor({ id: ID, created_at: at }))).toEqual({
      at: Date.parse(at),
      id: ID,
    });
    expect(parseSearchCursor('nope')).toBeNull();
  });
});
