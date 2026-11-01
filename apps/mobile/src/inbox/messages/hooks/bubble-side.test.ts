import { bubbleSide, stickerBubble } from './bubble-side';

describe('bubble sides as WhatsApp: ours at the inline-end, theirs at the start (RN mirrors them)', () => {
  it('ours: flex-end, the tail corner at the end', () => {
    expect(bubbleSide(true)).toEqual({ align: 'flex-end', outer: 'end' });
  });

  it('theirs: flex-start, the tail corner at the start', () => {
    expect(bubbleSide(false)).toEqual({ align: 'flex-start', outer: 'start' });
  });
});

describe('a sticker has no bubble (owner 2026-11-01)', () => {
  const sticker = { media_mime: 'image/webp', interactive_payload: null };
  it('no border, fill or side padding for staff; a teacher keeps the bubble', () => {
    expect(stickerBubble(sticker, false)).toEqual({ borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 });
    expect(stickerBubble(sticker, true)).toEqual({});
    expect(stickerBubble({ media_mime: 'image/jpeg', interactive_payload: null }, false)).toEqual({});
  });
});
