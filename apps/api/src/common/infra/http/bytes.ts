import { Passthrough } from './failure';

// A body read that stops the moment it passes the cap (modelled on crm-media.fetch.ts readCapped).

function concat(chunks: readonly Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  chunks.reduce((at, chunk) => {
    out.set(chunk, at);
    return at + chunk.byteLength;
  }, 0);
  return out;
}

async function cancel(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  await reader.cancel().catch(() => undefined);
}

/**
 * The stream's bytes; past `max` the stream is cancelled and `tooLarge()` is thrown to the caller
 * as is. A broken stream rejects with the reader's error (the core maps it to `reached: true`).
 */
export async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  max: number,
  tooLarge: () => Error,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    total += next.value.byteLength;
    if (total > max) {
      await cancel(reader);
      throw new Passthrough(tooLarge());
    }
    chunks.push(next.value);
  }
  return concat(chunks, total);
}
