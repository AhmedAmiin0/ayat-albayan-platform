// A POSIX tar (pax) writer for the Drive backup (docs/45 §5): no dependency, one entry at a time.
// Every file entry carries a pax header with its full UTF-8 path and size (keys can be long or
// Arabic) plus the platform's own records (AB.*: bucket, key, ETag, Content-Type).

export const BLOCK = 512;
/** Two zero blocks close an archive. */
export const TAR_END = Buffer.alloc(BLOCK * 2);
/** The largest size an ustar header field holds (11 octal digits); pax `size` carries more. */
const USTAR_MAX = 0o77777777777;

const octal = (n: number, width: number): string =>
  `${Math.floor(n)
    .toString(8)
    .padStart(width - 1, '0')}\0`;

/** Printable ASCII only, for the ustar name field (readers use the pax path). */
const asciiName = (name: string): string => name.replace(/[^\x20-\x7e]/g, '_').slice(0, 99);

/** Zero bytes after `size` bytes of data, up to the next block. */
export const padding = (size: number): Buffer => Buffer.alloc((BLOCK - (size % BLOCK)) % BLOCK);

/** The header checksum: every byte summed with the checksum field read as spaces. */
export function checksum(header: Buffer): number {
  let sum = 0;
  header.forEach((byte, i) => {
    sum += i >= 148 && i < 156 ? 0x20 : byte;
  });
  return sum;
}

interface HeaderInput {
  name: string;
  size: number;
  type: '0' | 'x';
  mtime: number;
}

function ustarHeader(input: HeaderInput): Buffer {
  const h = Buffer.alloc(BLOCK);
  h.write(asciiName(input.name), 0, 100, 'ascii');
  h.write(octal(0o644, 8), 100);
  h.write(octal(0, 8), 108);
  h.write(octal(0, 8), 116);
  h.write(octal(Math.min(input.size, USTAR_MAX), 12), 124);
  h.write(octal(input.mtime, 12), 136);
  h.write(input.type, 156);
  h.write('ustar\u000000', 257, 'ascii');
  h.write(`${checksum(h).toString(8).padStart(6, '0')}\0 `, 148, 'ascii');
  return h;
}

/** One pax record, «<length> <key>=<value>\n», the length counting itself. */
export function paxRecord(key: string, value: string): string {
  const base = Buffer.byteLength(` ${key}=${value}\n`, 'utf8');
  let n = base + 1;
  while (String(n).length + base !== n) n = String(n).length + base;
  return `${n} ${key}=${value}\n`;
}

interface EntryInput {
  /** The path inside the archive (`<bucket>/<key>`). */
  path: string;
  size: number;
  /** Seconds since the epoch. */
  mtime: number;
  records: Record<string, string>;
}

/** The pax header (records), then the file's own header; then the data, then padding(). */
export function entryHead(input: EntryInput): Buffer {
  const fields = { path: input.path, size: String(input.size), ...input.records };
  const pax = Buffer.from(
    Object.entries(fields)
      .map(([k, v]) => paxRecord(k, v))
      .join(''),
    'utf8',
  );
  const mtime = input.mtime;
  const paxHead = ustarHeader({ name: 'PaxHeader', size: pax.length, type: 'x', mtime });
  const head = ustarHeader({ name: input.path, size: input.size, type: '0', mtime });
  return Buffer.concat([paxHead, pax, padding(pax.length), head]);
}
