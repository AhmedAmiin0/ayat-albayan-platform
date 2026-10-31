import type { MessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { withHidden } from './hidden-view';

const view = {
  id: 'm1',
  body: 'صورة التحويل',
  media_mime: 'image/jpeg',
  media_url: 'http://signed',
  media_name: 'a.jpg',
  template_key: null,
  template_params: null,
  interactive_payload: null,
  reply_to: null,
  replyable: true,
  forwardable: true,
  click_to_chat: null,
  status: 'delivered',
  created_at: '2026-10-30T10:00:00Z',
} as unknown as MessageView;

describe('a hidden WhatsApp message (حذف من المنصة)', () => {
  it('becomes a placeholder: no text, file or actions; who and when', () => {
    const out = withHidden(view, {
      hidden_at: '2026-10-30T11:00:00Z',
      hider: { full_name: 'سارة' },
    });
    expect(out).toMatchObject({
      body: null,
      media_mime: null,
      media_url: null,
      media_name: null,
      replyable: false,
      forwardable: false,
    });
    expect(out.hidden).toEqual({ by_name: 'سارة', at: '2026-10-30T11:00:00Z' });
    expect([out.status, out.created_at]).toEqual(['delivered', '2026-10-30T10:00:00Z']);
  });

  it('a shown row is untouched; a gone login leaves the name empty', () => {
    expect(withHidden(view, { hidden_at: null, hider: null })).toBe(view);
    expect(
      withHidden(view, { hidden_at: '2026-10-30T11:00:00Z', hider: null }).hidden?.by_name,
    ).toBeNull();
  });
});
