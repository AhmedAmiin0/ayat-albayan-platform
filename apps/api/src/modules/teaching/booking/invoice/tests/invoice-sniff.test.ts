import { describe, expect, it } from 'vitest';
import { sniffMime } from '@/modules/teaching/booking/invoice/invoice-sniff';

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
    ['an Ogg (a voice note)', bytes('OggS\0\x02'), 'audio/ogg'],
    ['an MP4 recorded on Android (isom)', bytes('\0\0\0\x18ftypisom'), 'audio/mp4'],
    ['an M4A', bytes('\0\0\0\x1cftypM4A '), 'audio/mp4'],
    ['a webm voice note (EBML)', Uint8Array.of(0x1a, 0x45, 0xdf, 0xa3, 0x9f), 'audio/webm'],
    ['a WAV', bytes('RIFF\0\0\0\0WAVE'), 'audio/wav'],
    ['an ADTS AAC (MPEG-4)', Uint8Array.of(0xff, 0xf1, 0x50, 0x80), 'audio/aac'],
    ['an ADTS AAC (MPEG-2)', Uint8Array.of(0xff, 0xf9, 0x50, 0x80), 'audio/aac'],
    ['an MP3 with an ID3 tag', bytes('ID3\x04\0\0'), 'audio/mpeg'],
    ['an MP3 frame (FFFB)', Uint8Array.of(0xff, 0xfb, 0x90, 0x64), 'audio/mpeg'],
    ['an MPEG-2 audio frame (FFF3)', Uint8Array.of(0xff, 0xf3, 0x90, 0x64), 'audio/mpeg'],
    ['an MPEG-2.5 audio frame (FFE3)', Uint8Array.of(0xff, 0xe3, 0x90, 0x64), 'audio/mpeg'],
  ])('%s', (_name, head, mime) => expect(sniffMime(pad(head))).toBe(mime));

  it.each([
    ['text labelled as an image', bytes('ftypheic fake')],
    ['HTML', bytes('<html><script>')],
    ['an SVG', bytes('<svg xmlns=')],
    ['a RIFF that is neither WebP nor WAV (AVI)', bytes('RIFF\0\0\0\0AVI ')],
    ['a frame sync with the reserved layer 00 and no ADTS bits', Uint8Array.of(0xff, 0xe1)],
    ['ftyp at the wrong offset', bytes('ftypisom\0\0\0\0')],
    ['empty', new Uint8Array()],
  ])('refuses %s', (_name, head) => expect(sniffMime(pad(head))).toBeNull());
});
