/** Exact-size reads from a stream of buffers (the tar reader's input), holding one chunk. */
export class ByteReader {
  private held = Buffer.alloc(0);
  private readonly it: AsyncIterator<Uint8Array>;

  constructor(source: AsyncIterable<Uint8Array>) {
    this.it = source[Symbol.asyncIterator]();
  }

  /** Pulls until `n` bytes are held; false at the end of the stream. */
  private async fill(n: number): Promise<boolean> {
    while (this.held.length < n) {
      const next = await this.it.next();
      if (next.done === true) return false;
      this.held = Buffer.concat([this.held, Buffer.from(next.value)]);
    }
    return true;
  }

  /** Exactly `n` bytes; null at a clean end (nothing held); a cut-off stream throws. */
  async take(n: number): Promise<Buffer | null> {
    const full = await this.fill(n);
    if (!full && this.held.length === 0) return null;
    if (!full) throw new Error('tar_truncated');
    const out = this.held.subarray(0, n);
    this.held = this.held.subarray(n);
    return out;
  }

  /** Up to `max` bytes (at least one): what is held, else the next chunk. */
  async some(max: number): Promise<Buffer> {
    const ok = await this.fill(1);
    if (!ok) throw new Error('tar_truncated');
    const out = this.held.subarray(0, max);
    this.held = this.held.subarray(out.length);
    return out;
  }

  /** Skips `n` bytes. */
  async skip(n: number): Promise<void> {
    for (let left = n; left > 0;) left -= (await this.some(Math.min(left, 1 << 20))).length;
  }
}
