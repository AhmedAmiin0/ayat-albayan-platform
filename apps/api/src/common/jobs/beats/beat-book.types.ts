/** What a job tells the book when its timers start (the Ticker's timing). */
export interface BeatPlan {
  name: string;
  everyMs: number;
  /** First run after the timers start: a job that never succeeded counts from then. */
  firstMs: number;
}

/** Where a job's passes are recorded: the process's book (jobBeats), a fake in tests. */
export interface BeatSink {
  register(plan: BeatPlan): void;
  ok(name: string): void;
  fail(name: string, error: unknown): void;
  forget(name: string): void;
}
