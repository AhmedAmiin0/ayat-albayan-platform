import { describe, expect, it } from 'vitest';
import { threadRow } from '../inbox.fakes';
import { toThreadView } from './threads.mapper';

// Owner 2026-10-27: the chats list shows the media label (the clients' preview of a file with no
// caption), never the old CRM's storage link, for a last message imported from it.
const NOW = new Date('2026-10-27T09:00:00Z');
const LINK = 'https://files.crm.example/storage/v1/object/public/chat-media/account-test/inbound/1-image-1.webp';

describe('toThreadView — last message imported from the old CRM', () => {
  it('hides the link: last_body null, last_media_mime kept (the media label)', () => {
    const v = toThreadView(threadRow({ last_direction: 'inbound', last_body: LINK, last_media_mime: 'image/webp' }), NOW);
    expect([v.last_body, v.last_media_mime]).toEqual([null, 'image/webp']);
  });

  it('keeps a caption, a text link (no mime) and our own outbound text', () => {
    const caption = threadRow({ last_direction: 'inbound', last_body: 'صورة التحويل', last_media_mime: 'image/jpeg' });
    expect(toThreadView(caption, NOW).last_body).toBe('صورة التحويل');
    expect(toThreadView(threadRow({ last_direction: 'inbound', last_body: LINK, last_media_mime: null }), NOW).last_body).toBe(LINK);
    expect(toThreadView(threadRow({ last_direction: 'outbound', last_body: LINK, last_media_mime: 'image/webp' }), NOW).last_body).toBe(LINK);
  });
});
