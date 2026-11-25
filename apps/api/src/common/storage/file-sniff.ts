/** How many leading bytes tell an upload's formats apart (RIFF....WEBP, ftyp + brand: 12). */
export const SNIFF_BYTES = 12;

const ascii = (b: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...b.slice(from, to));
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']);
/** ADTS: 12 sync bits, MPEG-4/2 flag, layer 00 (FFF0/FFF1/FFF8/FFF9). */
const isAdts = (b: Uint8Array) => b[0] === 0xff && ((b[1] ?? 0) & 0xf6) === 0xf0;
/** An MPEG audio frame: 11 sync bits (FFEx/FFFx) and a layer other than the reserved 00. */
const isMpegFrame = (b: Uint8Array) =>
  b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0 && ((b[1] ?? 0) & 0x06) !== 0;
const isEbml = (b: Uint8Array) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;

const FORMATS: readonly (readonly [string, (b: Uint8Array) => boolean])[] = [
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/png', (b) => b[0] === 0x89 && ascii(b, 1, 4) === 'PNG'],
  ['application/pdf', (b) => ascii(b, 0, 5) === '%PDF-'],
  ['image/webp', (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP'],
  ['image/heic', (b) => ascii(b, 4, 8) === 'ftyp' && HEIC_BRANDS.has(ascii(b, 8, 12))],
  // A chat voice note: Android records AAC in MP4; ogg is its WhatsApp form.
  ['audio/ogg', (b) => ascii(b, 0, 4) === 'OggS'],
  ['audio/mp4', (b) => ascii(b, 4, 8) === 'ftyp' && !HEIC_BRANDS.has(ascii(b, 8, 12))],
  // A report's voice note or audio file (audit A2): the browser recorder writes webm.
  ['audio/webm', isEbml],
  ['audio/wav', (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE'],
  ['audio/aac', isAdts],
  ['audio/mpeg', (b) => ascii(b, 0, 3) === 'ID3' || isMpegFrame(b)],
];

/**
 * The mime the first bytes say the file is: JPEG, PNG, WebP, HEIC, PDF or ogg, MP4, webm, WAV,
 * AAC or MP3 audio; null for anything else. Each caller compares it with its own list (an
 * invoice still refuses audio).
 */
export function sniffMime(b: Uint8Array): string | null {
  return FORMATS.find(([, is]) => is(b))?.[0] ?? null;
}
