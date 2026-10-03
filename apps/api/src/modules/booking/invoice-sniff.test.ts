import { describe, expect, it } from 'vitest';
import { sniffMime } from './invoice-sniff';

const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const pad = (b: Uint8Array) => Uint8Array.from({ length: 12 }, (_, i) => b[i] ?? 0);

describe('sniffMime (what the file really is, not what Storage was told)', () => {
  it.each([
    ['JPEG', Uint8Array.of(0xff, 0xd8, 0xff, 0xe0), 'image/jpeg'],
    ['PNG', Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a), 'image/png'],
    ['PDF', bytes('%PDF-1.7'), 'application/pdf'],
    ['WebP', bytes('RIFF\0\0\0\0WEBP'), 'image/webp'],
    ['HEIC', bytes('\0\0\0\x18ftypheic'), 'image/heic'],
    ['HEIF burst brand', bytes('\0\0\0\x18ftypmif1'), 'image/heic'],
  ])('%s', (_name, head, mime) => expect(sniffMime(pad(head))).toBe(mime));

  it.each([
    ['text labelled as an image', bytes('ftypheic fake')],
    ['HTML', bytes('<html><script>')],
    ['an SVG', bytes('<svg xmlns=')],
    ['a RIFF that is not WebP (WAV)', bytes('RIFF\0\0\0\0WAVE')],
    ['an MP4', bytes('\0\0\0\x18ftypisom')],
    ['empty', new Uint8Array()],
  ])('refuses %s', (_name, head) => expect(sniffMime(pad(head))).toBeNull());
});
