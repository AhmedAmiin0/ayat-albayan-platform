const settled = (): void => undefined;

/**
 * One drain at a time per lane key (a line, or a number in module mode), across the chat and the
 * main tickers (docs/42 42-7): a chat-line template of the main pass and a chat text of the chat
 * pass never go out at the same time on one number, so the chat line and Evolution pacing stay one
 * at a time. Different keys run in parallel.
 */
export class LaneLocks {
  private readonly tails = new Map<string, Promise<void>>();

  run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const before = this.tails.get(key) ?? Promise.resolve();
    const result = before.then(work);
    const tail = result.then(settled, settled);
    this.tails.set(key, tail);
    void tail.then(() => this.forget(key, tail));
    return result;
  }

  /** Busy keys (tests). */
  get busy(): number {
    return this.tails.size;
  }

  private forget(key: string, tail: Promise<void>): void {
    const last = this.tails.get(key) === tail;
    if (last) this.tails.delete(key);
  }
}
