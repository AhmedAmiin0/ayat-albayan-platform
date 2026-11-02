import { describe, expect, it } from 'vitest';
import type { SearchRow } from './chat-search.repo';
import { searchPage } from './chat-search';

const id = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number, over: Partial<SearchRow> = {}): SearchRow => ({
  id: id(n),
  created_at: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString(),
  body: null,
  media_name: null,
  template_key: null,
  ...over,
});

describe('searchPage', () => {
  it('folded matching over bodies, captions and document names, newest first', () => {
    const rows = [
      row(1, { body: 'درس الإسلام' }),
      row(2, { body: 'لا شيء هنا' }),
      row(3, { media_name: 'اسلام-واجب.pdf' }),
      row(4, { body: 'الْإِسْلَامُ دِينُنَا' }),
    ];
    const page = searchPage(rows, { q: 'اسلام', limit: 50 });
    expect(page.items.map((h) => h.id)).toEqual([id(4), id(3), id(1)]);
    expect(page.total).toBe(3);
    expect(page.next_cursor).toBeNull();
    expect(page.items[1]?.snippet).toBe('اسلام-واجب.pdf');
  });

  it('pages by cursor: each hit once, the total stays the whole chat', () => {
    const rows = Array.from({ length: 7 }, (_, i) => row(i + 1, { body: `مدرسة ${i + 1}` }));
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let n = 0; n < 4; n += 1) {
      const page = searchPage(rows, { q: 'مدرسه', cursor, limit: 3 });
      expect(page.total).toBe(7);
      seen.push(...page.items.map((h) => h.id));
      cursor = page.next_cursor ?? undefined;
      if (!cursor) break;
    }
    expect(seen).toEqual([7, 6, 5, 4, 3, 2, 1].map(id));
  });

  it('rows sharing a time break the tie by id; a duplicate row counts once', () => {
    const at = '2026-10-01T00:00:00.000Z';
    const rows = [1, 2, 3].map((n) => row(n, { created_at: at, body: 'zoom' }));
    const first = searchPage([...rows, rows[0] as SearchRow], { q: 'ZOOM', limit: 2 });
    expect(first.total).toBe(3);
    const cursor = first.next_cursor ?? undefined;
    const second = searchPage(rows, { q: 'zoom', cursor, limit: 2 });
    expect([...first.items, ...second.items].map((h) => h.id)).toEqual([3, 2, 1].map(id));
  });

  it('no hit: an empty page', () => {
    expect(searchPage([row(1, { body: 'أهلًا' })], { q: 'وداعا', limit: 5 })).toEqual({
      items: [],
      total: 0,
      next_cursor: null,
    });
  });
});
