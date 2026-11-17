import { stickerBubble } from './bubble-side';

describe('a sticker has no bubble (owner 2026-11-01)', () => {
  const sticker = { media_mime: 'image/webp', interactive_payload: null };
  it('no border, fill or side padding for staff; a teacher keeps the bubble', () => {
    expect(stickerBubble(sticker, false)).toEqual({ borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 });
    expect(stickerBubble(sticker, true)).toEqual({});
    expect(stickerBubble({ media_mime: 'image/jpeg', interactive_payload: null }, false)).toEqual({});
  });
});
