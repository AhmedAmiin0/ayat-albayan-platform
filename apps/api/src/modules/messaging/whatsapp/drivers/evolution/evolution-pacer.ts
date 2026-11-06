// Baileys pacing (docs/19 «Evolution driver», ban risk): one Baileys number waits at least `gapMs`
// between two sends to DIFFERENT recipients. A send waits its turn; it is never dropped. Replies
// in one conversation (same recipient) go without the gap. In memory, per instance: the API runs
// one sender, and a restart only forgets the last send time (the next send waits nothing).

interface Last {
  to: string;
  at: number;
}

interface PacerClock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

const realClock: PacerClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** One instance's queue: sends are chained so two concurrent sends never share a slot. */
export class EvolutionPacer {
  private readonly last = new Map<string, Last>();
  private readonly tail = new Map<string, Promise<void>>();

  constructor(private readonly clock: PacerClock = realClock) {}

  /** Resolves when `to` may be sent from `key`; the slot is taken when it resolves. */
  turn(key: string, at: { to: string; gapMs: number }): Promise<void> {
    const prev = this.tail.get(key) ?? Promise.resolve();
    const mine = prev.then(() => this.wait(key, at));
    this.tail.set(key, mine.catch(() => undefined));
    return mine;
  }

  private async wait(key: string, at: { to: string; gapMs: number }): Promise<void> {
    const last = this.last.get(key);
    const due = last && last.to !== at.to ? last.at + at.gapMs - this.clock.now() : 0;
    if (due > 0) await this.clock.sleep(due);
    this.last.set(key, { to: at.to, at: this.clock.now() });
  }
}

/** The process-wide pacer every Evolution client of a Baileys number shares. */
export const evolutionPacer = new EvolutionPacer();
