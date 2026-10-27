import { describe, expect, it } from 'vitest';
import { CHAT_FILE_MIMES, WA_IMAGE_MAX_BYTES, chatFileProblem, waMediaKind } from './chat-files.js';

const TEN_MB = 10 * 1024 * 1024;

describe('waMediaKind', () => {
  it('an image travels as image, a PDF as document', () => {
    expect(waMediaKind('image/jpeg')).toBe('image');
    expect(waMediaKind('image/png')).toBe('image');
    expect(waMediaKind('application/pdf')).toBe('document');
    expect(waMediaKind(null)).toBe('document');
  });
});

describe('chatFileProblem', () => {
  it('accepts a JPEG within 5 MB and a PDF within the academy limit', () => {
    expect(chatFileProblem({ mime: 'image/jpeg', size: 1000, maxBytes: TEN_MB })).toBeNull();
    expect(chatFileProblem({ mime: 'application/pdf', size: TEN_MB, maxBytes: TEN_MB })).toBeNull();
  });

  it('a PNG over Meta’s 5 MB is too large even when the academy allows 10 MB', () => {
    expect(chatFileProblem({ mime: 'image/png', size: WA_IMAGE_MAX_BYTES + 1, maxBytes: TEN_MB })).toBe('file_too_large');
  });

  it('an image within 5 MB but over a smaller academy limit is too large', () => {
    expect(chatFileProblem({ mime: 'image/png', size: 3 * 1024 * 1024, maxBytes: 2 * 1024 * 1024 })).toBe('file_too_large');
  });

  it('a PDF over the academy limit, and an empty file, are too large', () => {
    expect(chatFileProblem({ mime: 'application/pdf', size: TEN_MB + 1, maxBytes: TEN_MB })).toBe('file_too_large');
    expect(chatFileProblem({ mime: 'application/pdf', size: 0, maxBytes: TEN_MB })).toBe('file_too_large');
  });

  it('refuses WebP, HEIC, audio and anything else', () => {
    for (const mime of ['image/webp', 'image/heic', 'audio/ogg', 'text/plain']) {
      expect(chatFileProblem({ mime, size: 10, maxBytes: TEN_MB })).toBe('file_type');
    }
  });
});

describe('chatFileProblem: a voice note (owner 2026-10-27)', () => {
  it('the chat send accepts audio/mp4 within the academy limit', () => {
    expect(chatFileProblem({ mime: 'audio/mp4', size: 360_000, maxBytes: TEN_MB }, CHAT_FILE_MIMES)).toBeNull();
    expect(chatFileProblem({ mime: 'audio/mp4; codecs=mp4a', size: 360_000, maxBytes: TEN_MB }, CHAT_FILE_MIMES)).toBeNull();
    expect(chatFileProblem({ mime: 'audio/mp4', size: TEN_MB + 1, maxBytes: TEN_MB }, CHAT_FILE_MIMES)).toBe('file_too_large');
  });

  it('by default (saved replies, the web attach) audio is still refused', () => {
    expect(chatFileProblem({ mime: 'audio/mp4', size: 360_000, maxBytes: TEN_MB })).toBe('file_type');
  });

  it('the chat send still refuses ogg and other audio', () => {
    expect(chatFileProblem({ mime: 'audio/ogg', size: 10, maxBytes: TEN_MB }, CHAT_FILE_MIMES)).toBe('file_type');
  });
});
