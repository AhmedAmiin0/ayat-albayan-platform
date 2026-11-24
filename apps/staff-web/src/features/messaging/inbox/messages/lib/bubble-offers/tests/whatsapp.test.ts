import { describe, expect, it } from 'vitest';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { bubbleOffers, offersAny } from '@/features/messaging/inbox/messages/lib/bubble-offers/bubble-offers';

const held = message({
  id: 'm1',
  direction: 'outbound',
  status: 'queued',
  error_code: 'awaiting_reply',
  body: 'السلام عليكم',
  replyable: false,
  forwardable: false,
});

describe('bubbleOffers.whatsapp', () => {
  it('admin: offered, and the menu has something to show', () => {
    const offers = bubbleOffers(held, { teacher: false, admin: true });
    expect(offers.whatsapp).toBe(true);
    expect(offersAny({ ...offers, copy: false, noEdit: false })).toBe(true);
  });

  it('teacher or sales mode (no admin): never', () => {
    expect(bubbleOffers(held, { teacher: true }).whatsapp).toBe(false);
    expect(bubbleOffers(held, { teacher: false, admin: false }).whatsapp).toBe(false);
  });

  it('a file or another failure: never', () => {
    const photo = { ...held, body: null, media_mime: 'image/jpeg' };
    expect(bubbleOffers(photo, { teacher: false, admin: true }).whatsapp).toBe(false);
    const failed = { ...held, status: 'failed' as const, error_code: '131026' };
    expect(bubbleOffers(failed, { teacher: false, admin: true }).whatsapp).toBe(false);
  });
});
