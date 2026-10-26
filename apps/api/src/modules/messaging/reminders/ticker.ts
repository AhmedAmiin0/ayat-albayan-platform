import { Logger } from '@nestjs/common';

export interface TickerOptions {
  name: string;
  /** First run after boot: soon, not at once (every API test boots AppModule). */
  firstMs: number;
  everyMs: number;
  /** One pass; expected never to throw (a rejection is only logged). */
  run: () => Promise<unknown>;
}

/**
 * In-process interval with single flight: a tick while the previous run is still going joins it
 * instead of starting a second one, so a slow database never stacks runs. Timers are unref'd.
 * ponytail: one API instance (like HorizonJob / AlertsJob); a second instance only repeats work,
 * which the dedup keys make a no-op (rule 8). Move to pg_cron / pg-boss when the API scales out.
 */
export class Ticker {
  private readonly log: Logger;
  private readonly timers: NodeJS.Timeout[] = [];
  private running: Promise<unknown> | null = null;

  constructor(private readonly opts: TickerOptions) {
    this.log = new Logger(opts.name);
  }

  start(): void {
    const tick = () => void this.tick();
    this.timers.push(setTimeout(tick, this.opts.firstMs).unref(), setInterval(tick, this.opts.everyMs).unref());
  }

  stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers.length = 0;
  }

  /** Run now, or join the run in progress. */
  tick(): Promise<unknown> {
    this.running ??= this.opts
      .run()
      .catch((e: unknown) => this.log.error(`run aborted: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }
}
