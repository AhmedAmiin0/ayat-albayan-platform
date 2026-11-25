import { errorMessage } from '@ab/core';
import { Logger } from '@nestjs/common';
import { jobBeats } from '@/common/jobs/beats/beat-book';
import type { BeatSink } from '@/common/jobs/beats/beat-book';

/** When the first run comes after boot and how often the next ones do. */
interface TickerTiming {
  /** First run after boot: soon, not at once (every API test boots AppModule). */
  firstMs: number;
  /** Absent: one run after boot, no interval (e.g. the template boot check). */
  everyMs?: number;
}

interface TickerOptions extends TickerTiming {
  name: string;
  /** One pass; expected never to throw (a rejection is only logged). */
  run: () => Promise<unknown>;
  /** What a timer calls: `tick` joins a run in progress (default), `kick` queues one more. */
  timer?: 'tick' | 'kick';
  /** Where each pass is recorded (the process's heartbeats; a fake in tests). */
  beats?: BeatSink;
}

/**
 * In-process interval with single flight: a tick while the previous run is still going joins it
 * instead of starting a second one, so a slow database never stacks runs; kick() queues one more
 * run instead (timer 'kick' makes the timers kick). Timers are unref'd; start() once per job.
 * ponytail: one API instance (like HorizonJob / AlertsJob); a second instance only repeats work,
 * which the dedup keys make a no-op (rule 8). Move to pg_cron / pg-boss when the API scales out.
 */
export class Ticker {
  private readonly log: Logger;
  private readonly timers: NodeJS.Timeout[] = [];
  private running: Promise<void> | null = null;
  private again = false;
  private stopped = false;
  private readonly beats: BeatSink;

  constructor(private readonly opts: TickerOptions) {
    this.log = new Logger(opts.name);
    this.beats = opts.beats ?? jobBeats;
  }

  /** Starts the timers; `timing` replaces the options' one (read at boot, e.g. from env). */
  start(timing: TickerTiming = this.opts): void {
    const method = this.opts.timer ?? 'tick';
    const fire = () => void this[method]();
    const every = timing.everyMs === undefined ? [] : [setInterval(fire, timing.everyMs).unref()];
    this.timers.push(setTimeout(fire, timing.firstMs).unref(), ...every);
    // Interval jobs only: a one-shot boot job has no interval to be late against.
    const { everyMs, firstMs } = timing;
    if (everyMs !== undefined) this.beats.register({ name: this.opts.name, firstMs, everyMs });
  }

  /** Stops the timers and new runs; settles once the run in flight ends (BE-14). */
  stop(): Promise<void> {
    this.stopped = true;
    this.beats.forget(this.opts.name);
    this.timers.forEach(clearTimeout);
    this.timers.length = 0;
    return this.running ?? Promise.resolve();
  }

  get stopping(): boolean {
    return this.stopped;
  }

  /** Run now, or join the run in progress; nothing once stopped. */
  tick(): Promise<void> {
    if (this.stopped) return this.running ?? Promise.resolve();
    this.running ??= this.passes().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /**
   * Run now (after an enqueue or an admin retry) instead of waiting for the next tick. A kick
   * during a run queues exactly one more run; the promise settles after it.
   */
  kick(): Promise<void> {
    this.again = this.running !== null;
    return this.tick();
  }

  private async passes(): Promise<void> {
    do {
      this.again = false;
      this.beats.begin(this.opts.name);
      await this.opts.run().then(
        () => this.beats.ok(this.opts.name),
        (e: unknown) => this.failed(e),
      );
    } while (this.queued());
  }

  private failed(e: unknown): void {
    this.log.error(`run aborted: ${errorMessage(e)}`);
    this.beats.fail(this.opts.name, e);
  }

  /** Read through a call: a kick() during the awaited run sets it. */
  private queued(): boolean {
    return this.again && !this.stopped;
  }
}
