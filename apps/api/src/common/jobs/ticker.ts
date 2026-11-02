import { Logger } from '@nestjs/common';

/** When the first run comes after boot and how often the next ones do. */
interface TickerTiming {
  /** First run after boot: soon, not at once (every API test boots AppModule). */
  firstMs: number;
  everyMs: number;
}

interface TickerOptions extends TickerTiming {
  name: string;
  /** One pass; expected never to throw (a rejection is only logged). */
  run: () => Promise<unknown>;
  /** What a timer calls: `tick` joins a run in progress (default), `kick` queues one more. */
  timer?: 'tick' | 'kick';
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

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

  constructor(private readonly opts: TickerOptions) {
    this.log = new Logger(opts.name);
  }

  /** Starts the timers; `timing` replaces the options' one (read at boot, e.g. from env). */
  start(timing: TickerTiming = this.opts): void {
    const method = this.opts.timer ?? 'tick';
    const fire = () => void this[method]();
    this.timers.push(
      setTimeout(fire, timing.firstMs).unref(),
      setInterval(fire, timing.everyMs).unref(),
    );
  }

  stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers.length = 0;
  }

  /** Run now, or join the run in progress. */
  tick(): Promise<void> {
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
      await this.opts.run().catch((e: unknown) => this.log.error(`run aborted: ${messageOf(e)}`));
    } while (this.queued());
  }

  /** Read through a call: a kick() during the awaited run sets it. */
  private queued(): boolean {
    return this.again;
  }
}
