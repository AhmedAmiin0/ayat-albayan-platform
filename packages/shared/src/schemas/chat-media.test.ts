import { describe, expect, it } from 'vitest';
import { INVOICE_MAX_BYTES, INVOICE_MIMES } from './booking-extras.js';
import {
  CHAT_VIEW_MIMES,
  PLAYABLE_MAX_BYTES,
  baseMime,
  chatFileMaxBytes,
  isChatViewMime,
  isPlayableMime,
} from './chat-media.js';

describe('chat media types (owner 2026-10-19 #1)', () => {
  it('strips parameters and case', () => {
    expect(baseMime('Audio/OGG; codecs=opus')).toBe('audio/ogg');
    expect(baseMime(null)).toBe('');
  });

  it('a bubble opens images, PDFs, voice notes and videos', () => {
    for (const m of INVOICE_MIMES) expect(isChatViewMime(m)).toBe(true);
    expect(isChatViewMime('audio/ogg; codecs=opus')).toBe(true);
    expect(isChatViewMime('video/3gpp')).toBe(true);
    expect(isChatViewMime('application/zip')).toBe(false);
    expect(isChatViewMime(null)).toBe(false);
    expect(CHAT_VIEW_MIMES).toHaveLength(INVOICE_MIMES.length + 7);
  });

  it('only audio and video are playable', () => {
    expect(isPlayableMime('audio/mpeg')).toBe(true);
    expect(isPlayableMime('video/mp4')).toBe(true);
    expect(isPlayableMime('image/jpeg')).toBe(false);
    expect(isPlayableMime('application/pdf')).toBe(false);
  });

  it('16 MB for audio/video, 10 MB for images and PDFs', () => {
    expect(PLAYABLE_MAX_BYTES).toBe(16_777_216);
    expect(chatFileMaxBytes('audio/ogg; codecs=opus')).toBe(PLAYABLE_MAX_BYTES);
    expect(chatFileMaxBytes('video/mp4')).toBe(PLAYABLE_MAX_BYTES);
    expect(chatFileMaxBytes('image/png')).toBe(INVOICE_MAX_BYTES);
    expect(chatFileMaxBytes(null)).toBe(INVOICE_MAX_BYTES);
  });
});
