import { describe, expect, it } from 'vitest';
import { crmLink } from './crm-history/crm-history.fakes';
import { toMessageView } from './message.mapper';
import { messageRow } from '../sender/sender.fakes';

// Owner 2026-10-27: an imported CRM file's body is only its storage link; the bubble is a photo /
// voice note with no caption, never the raw link. The stored row is not edited.

const crm = { direction: 'inbound', media_id: null, media_path: null, template_key: null, template_params: null } as const;
const view = (over: Parameters<typeof messageRow>[0]) => toMessageView({ row: messageRow({ ...crm, ...over }), template: null });

describe('toMessageView — files imported from the old CRM', () => {
  it('a photo or voice note: no body, the mime kept, no click-to-chat text', () => {
    for (const media_mime of ['image/webp', 'image/jpeg', 'audio/ogg; codecs=opus', 'video/mp4']) {
      const v = view({ body: crmLink(), media_mime });
      expect([v.body, v.media_mime, v.click_to_chat]).toEqual([null, media_mime, null]);
    }
  });

  it('still no body once cached (media_path set), and forwardable as a file even when old', () => {
    const v = view({ body: crmLink(), media_mime: 'image/webp', media_path: 'm.webp', created_at: '2026-09-10T08:00:00Z' });
    expect([v.body, v.forwardable]).toEqual([null, true]);
    expect(view({ body: crmLink(), media_mime: 'audio/ogg', created_at: '2026-09-10T08:00:00Z' }).forwardable).toBe(true);
  });

  it('a link with a caption, a row with Meta\'s media id, or a link without a mime keeps its body', () => {
    expect(view({ body: `شاهد ${crmLink()}`, media_mime: 'image/webp' }).body).toBe(`شاهد ${crmLink()}`);
    expect(view({ body: crmLink(), media_mime: 'image/webp', media_id: 'mid' }).body).toBe(crmLink());
    expect(view({ body: crmLink(), media_mime: null }).body).toBe(crmLink());
  });
});
