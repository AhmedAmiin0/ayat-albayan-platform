/** Keys that failed within `ms`: a PDF that always fails or hangs skips the slot on later views. */
export class FailedRecently {
  private readonly until = new Map<string, number>();

  constructor(
    private readonly ms: number,
    private readonly now: () => number = Date.now,
  ) {}

  has(key: string): boolean {
    return (this.until.get(key) ?? 0) > this.now();
  }

  add(key: string): void {
    const now = this.now();
    for (const [k, t] of this.until) if (t <= now) this.until.delete(k);
    this.until.set(key, now + this.ms);
  }
}
