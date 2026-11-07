// The upload's stream helpers (upload.ts): fixed-size chunks, and which one is the last.

/** Exactly `size`-byte buffers (the last one shorter), holding at most one of them. */
export async function* rechunk(source: AsyncIterable<Uint8Array>, size: number) {
  let held: Buffer[] = [];
  let n = 0;
  for await (const piece of source) {
    held.push(Buffer.from(piece));
    n += piece.length;
    for (; n >= size; n -= size) {
      const all = Buffer.concat(held);
      yield all.subarray(0, size);
      held = [all.subarray(size)];
    }
  }
  if (n > 0) yield Buffer.concat(held);
}

/** Each item with whether it is the last (one item of lookahead). */
export async function* withLast<T>(
  source: AsyncIterable<T>,
): AsyncGenerator<{ item: T; last: boolean }> {
  let held: { item: T } | null = null;
  for await (const item of source) {
    if (held) yield { item: held.item, last: false };
    held = { item };
  }
  if (held) yield { item: held.item, last: true };
}
