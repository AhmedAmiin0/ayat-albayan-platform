import { describe, expect, it } from 'vitest';
import { messageSearchPage } from './message-search';
import type { MessageSearchRow } from './message-search.repo';

const LINK = 'https://crm.test/storage/v1/object/public/chat-media/a/chat-media.pdf';

const row = (n: number, over: Partial<MessageSearchRow> = {}): MessageSearchRow => ({
  id: `b0000000-0000-4000-8000-00000000000${n}`,
  created_at: `2026-10-0${n}T10:00:00.123456+00:00`,
  body: `موعد الحلقة رقم ${n}`,
  media_name: null,
  template_key: null,
  direction: 'outbound',
  media_mime: null,
  phone_e164: '+966500000001',
  display_name: 'ولي أمر تجريبي',
  ...over,
});

describe('messageSearchPage', () => {
  it('limit + 1 rows: the page, and the cursor from its last raw row (microseconds kept)', () => {
    const page = messageSearchPage([row(3), row(2), row(1)], { q: 'الحلقه', limit: 2 });
    expect(page.items.map((h) => h.id.at(-1))).toEqual(['3', '2']);
    expect(page.next_cursor).toBe(`${row(2).created_at}_${row(2).id}`);
    expect(messageSearchPage([row(2), row(1)], { q: 'الحلقه', limit: 2 }).next_cursor).toBeNull();
  });

  it('an old-CRM link row is dropped, yet the cursor still advances past it', () => {
    const crm = row(1, { body: LINK, direction: 'inbound', media_mime: 'application/pdf' });
    const page = messageSearchPage([row(3), crm, row(0)], { q: 'chat-media', limit: 2 });
    expect(page.items).toEqual([]);
    expect(page.next_cursor).toBe(`${crm.created_at}_${crm.id}`);
  });

  it('snippets around the first match; the chat and its name pass through', () => {
    const named = row(4, { display_name: null, phone_e164: '+966500000002', media_name: 'خطة.pdf' });
    const [hit] = messageSearchPage([named], { q: 'خطه', limit: 30 }).items;
    expect(hit).toMatchObject({ phone_e164: '+966500000002', display_name: null, snippet: 'خطة.pdf' });
    const [first] = messageSearchPage([row(5)], { q: 'رقم', limit: 30 }).items;
    expect(first?.snippet).toContain('رقم');
    expect(first?.display_name).toBe('ولي أمر تجريبي');
  });
});
