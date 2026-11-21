import type { JobBeat } from '@ab/shared';
import type { BeatPlan, BeatSink, LoggedFailures } from './beat-book.types';

/** The longest error text kept (the schema's cap). */
const ERROR_CHARS = 500;

const textOf = (e: unknown): string =>
  (e instanceof Error ? e.message : String(e)).slice(0, ERROR_CHARS);

/**
 * This process's heartbeats: each job's last success and last error, stamped with the server
 * clock (never a client's). In memory only; BeatMirror copies it to Redis for the API copies.
 */
export class BeatBook implements BeatSink, LoggedFailures {
  private readonly beats = new Map<string, JobBeat>();
  /** Jobs whose current pass recorded an error (jobs catch their own, then resolve). */
  private readonly failedPass = new Set<string>();
  private readonly listeners: (() => void)[] = [];

  constructor(private readonly now: () => number = Date.now) {}

  register(plan: BeatPlan): void {
    const since = this.now() + plan.firstMs;
    const beat = { name: plan.name, everyMs: plan.everyMs, since };
    this.beats.set(plan.name, { ...beat, lastOkAt: null, lastErrorAt: null, lastError: null });
    this.changed();
  }

  begin(name: string): void {
    this.failedPass.delete(name);
  }

  ok(name: string): void {
    if (this.failedPass.has(name)) return;
    this.patch(name, { lastOkAt: this.now() });
  }

  fail(name: string, error: unknown): void {
    if (this.beats.has(name)) this.failedPass.add(name);
    this.patch(name, { lastErrorAt: this.now(), lastError: textOf(error) });
  }

  /** An error log line under `context` (a job's class name) fails that job and its lanes. */
  failLogged(context: string, message: string): void {
    const ours = (name: string): boolean => name === context || name.startsWith(`${context}:`);
    for (const name of [...this.beats.keys()].filter(ours)) this.fail(name, message);
  }

  forget(name: string): void {
    this.beats.delete(name);
    this.changed();
  }

  list(): JobBeat[] {
    return [...this.beats.values()];
  }

  /** Called after every change; a listener's error is swallowed (a beat never fails a job). */
  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners.splice(this.listeners.indexOf(listener), 1);
    };
  }

  private patch(name: string, change: Partial<JobBeat>): void {
    const beat = this.beats.get(name);
    if (!beat) return;
    this.beats.set(name, { ...beat, ...change });
    this.changed();
  }

  private changed(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // The mirror logs its own failures; the job goes on.
      }
    }
  }
}

/** The process's one book: every Ticker writes here, /ready and the admin list read it. */
export const jobBeats = new BeatBook();
