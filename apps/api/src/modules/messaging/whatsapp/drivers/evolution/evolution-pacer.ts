// Baileys pacing (docs/19 «Evolution driver», ban risk): one Baileys number leaves at least `gapMs`
// between two sends to DIFFERENT recipients; replies in one conversation (same recipient) go
// without the gap. It never sleeps: the sender asks `waitMs` before the claim and, while a number
// must wait, reschedules that row (next_attempt_at) and goes on with the others, so one paced
// number never delays a Kapso, CRM or Meta row. In memory, per instance: the API runs one sender,
// and a restart only forgets the last send time (the next send waits nothing).

interface Last {
  to: string;
  at: number;
}

interface PacerClock {
  now: () => number;
}

const realClock: PacerClock = { now: () => Date.now() };

/** Where one send leaves from and goes to, and the number's gap. */
interface PaceAt {
  key: string;
  to: string;
  gapMs: number;
}

export class EvolutionPacer {
  private readonly last = new Map<string, Last>();

  constructor(private readonly clock: PacerClock = realClock) {}

  /** Milliseconds before `to` may be sent from `key` (0 = now). Reads only; takes no slot. */
  waitMs(at: PaceAt): number {
    const last = this.last.get(at.key);
    const due = last && last.to !== at.to ? last.at + at.gapMs - this.clock.now() : 0;
    return Math.max(0, due);
  }

  /** The send went out (or was handed to Evolution): the next one to another recipient waits. */
  mark(at: Pick<PaceAt, 'key' | 'to'>): void {
    this.last.set(at.key, { to: at.to, at: this.clock.now() });
  }
}

/** The process-wide pacer every Evolution client of a Baileys number shares. */
export const evolutionPacer = new EvolutionPacer();
