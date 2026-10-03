/** How many leading bytes tell the formats of an invoice apart (RIFF....WEBP and ftyp + brand need 12). */
export const SNIFF_BYTES = 12;

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']);

const FORMATS: readonly (readonly [string, (b: Uint8Array) => boolean])[] = [
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/png', (b) => b[0] === 0x89 && ascii(b, 1, 4) === 'PNG'],
  ['application/pdf', (b) => ascii(b, 0, 5) === '%PDF-'],
  ['image/webp', (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP'],
  ['image/heic', (b) => ascii(b, 4, 8) === 'ftyp' && HEIC_BRANDS.has(ascii(b, 8, 12))],
];

/** The mime the first bytes say the file is: JPEG, PNG, WebP, HEIC or PDF; null for anything else. */
export function sniffMime(b: Uint8Array): string | null {
  return FORMATS.find(([, is]) => is(b))?.[0] ?? null;
}
