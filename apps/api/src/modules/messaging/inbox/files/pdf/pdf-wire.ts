import type { Readable } from 'node:stream';

// The PDF sandbox's wire (docs/09 «PDF sandbox»): an API copy (pdf-client.ts) and ayat-pdf
// (pdf-sandbox.handler.ts) speak HTTP over one unix socket on the shared pdf-sock volume, and nothing else.

/** Where ayat-pdf listens: the pdf-sock volume, mounted at /run/pdf in ayat-pdf and in both API copies. */
export const PDF_SOCKET = '/run/pdf/pdf.sock';

/**
 * The whole body of `stream`, or null once it passes `max` bytes (the stream is then destroyed, the rest
 * never read) or closes before its end (the other side went away).
 */
export function readCapped(stream: Readable, max: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > max) {
        resolve(null);
        stream.destroy();
        return;
      }
      chunks.push(chunk);
    });
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('close', () => resolve(null));
    stream.once('error', reject);
  });
}
