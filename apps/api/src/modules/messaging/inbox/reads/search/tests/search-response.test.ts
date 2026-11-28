import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { searchPage } from '@/modules/messaging/inbox/reads/search/chat-search';
import { messageSearchPage } from '@/modules/messaging/inbox/reads/search/message-search';
import type { MessageSearchRow } from '@/modules/messaging/inbox/reads/search/message-search.repo';

const row = (over: Partial<MessageSearchRow> = {}): MessageSearchRow => ({
  id: 'b0000000-0000-4000-8000-000000000001',
  created_at: '2026-10-01T10:00:00.123456+00:00',
  body: 'موعد الحلقة',
  media_name: null,
  template_key: null,
  direction: 'outbound',
  media_mime: null,
  phone_e164: '+966500000001',
  display_name: null,
  ...over,
});

describe('the search pages are checked against their answer schemas', () => {
  it('passes a page that fits', () => {
    expect(messageSearchPage([row()], { q: 'الحلقه', limit: 30 }).items).toHaveLength(1);
    expect(searchPage([row()], { q: 'الحلقه', limit: 50 }).total).toBe(1);
  });

  it('refuses a global hit whose chat number is not E.164 instead of sending it', () => {
    const bad = () =>
      messageSearchPage([row({ phone_e164: 'unknown' })], { q: 'الحلقه', limit: 30 });
    expect(bad).toThrow(InternalServerErrorException);
    expect(bad).toThrow('response_invalid');
  });

  it('refuses a chat hit whose id is not a uuid instead of sending it', () => {
    const bad = () => searchPage([row({ id: 'm1' })], { q: 'الحلقه', limit: 50 });
    expect(bad).toThrow('response_invalid');
  });
});
