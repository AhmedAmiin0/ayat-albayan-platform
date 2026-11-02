import { describe, expect, it } from 'vitest';
import { waSendKind } from '../chat/chat-files.js';
import {
  gifListSchema,
  isGifMessage,
  isStickerMessage,
  stickerKey,
  stickerPayloadOf,
  threadGifSendSchema,
} from './stickers.js';

const SHA = 'Zm9vYmFy';
const inbound = { type: 'sticker', sticker: { id: 'm1', mime_type: 'image/webp', sha256: SHA, animated: false } };

describe('stickers (owner 2026-11-01)', () => {
  it('a WebP or Meta’s sticker type is a sticker; a photo is not', () => {
    expect(isStickerMessage({ media_mime: 'image/webp', interactive_payload: null })).toBe(true);
    expect(isStickerMessage({ media_mime: null, interactive_payload: inbound })).toBe(true);
    expect(isStickerMessage({ media_mime: 'image/jpeg', interactive_payload: { type: 'image' } })).toBe(false);
  });

  it('a WebP travels as WhatsApp’s sticker; a JPEG stays an image, a PDF a document', () => {
    expect(waSendKind('image/webp')).toBe('sticker');
    expect(waSendKind('image/jpeg')).toBe('image');
    expect(waSendKind('application/pdf')).toBe('document');
  });

  it('one key per file across its messages: the sha256, else the message', () => {
    expect(stickerKey({ id: 'a', interactive_payload: inbound })).toBe(`sha:${SHA}`);
    expect(stickerKey({ id: 'a', interactive_payload: null })).toBe('msg:a');
  });

  it('a sent copy keeps only the type and the sha256', () => {
    expect(stickerPayloadOf(inbound)).toEqual({ type: 'sticker', sticker: { sha256: SHA } });
    expect(stickerPayloadOf({ type: 'image' })).toEqual({ type: 'sticker' });
  });
});

describe('GIFs (owner 2026-11-01)', () => {
  it('ours from GIPHY, or a video flagged animated, plays as a GIF; any other video does not', () => {
    expect(isGifMessage({ interactive_payload: { type: 'gif' } })).toBe(true);
    expect(isGifMessage({ interactive_payload: { type: 'video', video: { animated: true } } })).toBe(true);
    expect(isGifMessage({ interactive_payload: { type: 'video', video: { id: 'v' } } })).toBe(false);
    expect(isGifMessage({ interactive_payload: null })).toBe(false);
  });

  it('a GIF send takes a GIPHY id, never a link', () => {
    const id = '7a8b0b8e-5b8f-4f43-9a51-4a7f6c1f0b11';
    expect(threadGifSendSchema.safeParse({ gifId: 'xT9IgG50Fb7Mi0prBC', clientRequestId: id }).success).toBe(true);
    expect(threadGifSendSchema.safeParse({ gifId: 'https://evil.example/x.mp4', clientRequestId: id }).success).toBe(false);
  });

  it('the list without a GIPHY key is not configured and empty', () => {
    const none = { configured: false, items: [] };
    expect(gifListSchema.parse(none)).toEqual(none);
  });
});
