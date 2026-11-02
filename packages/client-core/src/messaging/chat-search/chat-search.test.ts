import { describe, expect, it } from 'vitest';
import {
  canStep,
  CHAT_SEARCH_CLOSED,
  chatSearchPath,
  chatSearchReducer,
  needsSearchPage,
  parseChatSearchPage,
  searchCounter,
  searchHits,
} from '../../index.js';

const hit = (n: number) => ({
  id: `b0000000-0000-4000-8000-00000000000${n}`,
  created_at: '2026-10-01T00:00:00.000Z',
  snippet: `s${n}`,
});

describe('chat search requests', () => {
  it('encodes the phone and the words; the cursor only when given', () => {
    expect(chatSearchPath('+966500000001', 'درس 50%')).toBe(
      `/threads/%2B966500000001/search?q=${encodeURIComponent('درس')}+50%25`,
    );
    expect(chatSearchPath('+1', 'a', 'c_1')).toBe('/threads/%2B1/search?q=a&cursor=c_1');
  });

  it('parses the page and flattens the loaded hits, the total from the first page', () => {
    const page = parseChatSearchPage({ items: [hit(1)], total: 3, next_cursor: 'x' });
    const next = parseChatSearchPage({ items: [hit(2)], total: 3, next_cursor: null });
    expect(searchHits([page, next])).toEqual({ hits: [hit(1), hit(2)], total: 3 });
    expect(searchHits(undefined)).toEqual({ hits: [], total: 0 });
    expect(() => parseChatSearchPage({ items: 'x' })).toThrow();
  });
});

describe('chatSearchReducer (next / previous)', () => {
  it('opens, types (back to the newest hit) and closes to the start', () => {
    const open = chatSearchReducer(CHAT_SEARCH_CLOSED, { type: 'open' });
    expect(open.open).toBe(true);
    const typed = chatSearchReducer({ ...open, index: 4 }, { type: 'type', text: 'درس' });
    expect(typed).toEqual({ open: true, text: 'درس', index: 0 });
    expect(chatSearchReducer(typed, { type: 'close' })).toEqual(CHAT_SEARCH_CLOSED);
  });

  it('steps older and newer inside the hits, never wrapping', () => {
    let s = { open: true, text: 'x', index: 0 };
    s = chatSearchReducer(s, { type: 'step', dir: 'older', total: 2 });
    expect(s.index).toBe(1);
    s = chatSearchReducer(s, { type: 'step', dir: 'older', total: 2 });
    expect(s.index).toBe(1);
    s = chatSearchReducer(s, { type: 'step', dir: 'newer', total: 2 });
    s = chatSearchReducer(s, { type: 'step', dir: 'newer', total: 2 });
    expect(s.index).toBe(0);
    expect(chatSearchReducer(s, { type: 'step', dir: 'older', total: 0 }).index).toBe(0);
  });

  it('canStep, the page need and «N من M»', () => {
    expect([canStep(0, 'newer', 3), canStep(0, 'older', 3), canStep(2, 'older', 3)]).toEqual([
      false,
      true,
      false,
    ]);
    expect([needsSearchPage(49, 50), needsSearchPage(50, 50)]).toEqual([false, true]);
    expect(searchCounter(0, 12)).toEqual({ n: 1, m: 12 });
    expect(searchCounter(0, 0)).toBeNull();
  });
});
