import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { backgroundJobs } from '../../../config/role/background-job';
import { Ticker } from '../../messaging/reminders';

/** What one boot started: timers per @BackgroundJob (by name), other timers by source file, Tickers. */
export interface BootProbe {
  jobTimers: Map<string, number>;
  otherTimers: Set<string>;
  tickers: string[];
}

type Boot = (this: unknown) => unknown;
type TimerFn = (...args: unknown[]) => unknown;

const APP = /apps[/\\]api[/\\]src[/\\]([^:)]+)/;

/**
 * Who asked for the timer: the frame right below this probe, if it is app code (a library's own timer,
 * like a fetch timeout, is not a job). The shared Ticker is skipped so its owner is named instead.
 */
function caller(stack: string | undefined): string | null {
  const frames = (stack ?? '')
    .split('\n')
    .slice(1)
    .filter(
      (l) => !/roles\.boot|tinyspy|@vitest|[/\\]vitest[/\\]dist|reminders[/\\]ticker\.ts/.test(l),
    );
  const file = frames[0]?.match(APP)?.[1]?.replaceAll('\\', '/');
  return file && !file.endsWith('.test.ts') ? file : null;
}

/** Wraps a global timer: a call during a job's boot hook counts for that job, any other by its caller. */
function watchTimer(
  key: 'setTimeout' | 'setInterval',
  probe: BootProbe,
  current: () => string | null,
): void {
  const fake = globalThis[key] as unknown as TimerFn;
  const watched: TimerFn = (...args) => {
    const job = current();
    if (job) probe.jobTimers.set(job, (probe.jobTimers.get(job) ?? 0) + 1);
    else {
      const file = caller(new Error().stack);
      if (file) probe.otherTimers.add(file);
    }
    return fake(...args);
  };
  vi.spyOn(globalThis, key).mockImplementation(watched as never);
}

function watchJobs(probe: BootProbe): () => string | null {
  let current: string | null = null;
  for (const [name, job] of backgroundJobs()) {
    const proto = job.prototype as unknown as Record<string, Boot>;
    const gated = proto.onApplicationBootstrap as Boot;
    vi.spyOn(proto, 'onApplicationBootstrap').mockImplementation(function boot(this: unknown) {
      current = name;
      try {
        return gated.apply(this);
      } finally {
        current = null;
      }
    });
  }
  vi.spyOn(Ticker.prototype, 'start').mockImplementation(function start(this: Ticker) {
    const job = current ?? 'outside a job';
    probe.tickers.push(job);
    probe.jobTimers.set(job, (probe.jobTimers.get(job) ?? 0) + 1);
  });
  return () => current;
}

/**
 * Boots the real AppModule in `role` with fake timers and records every timer it starts, however it is
 * written (setTimeout, setInterval, a Ticker, in onModuleInit or onApplicationBootstrap). `hours` of fake
 * time then pass, so a timer a per-copy refresh starts later is seen too (0 = boot only).
 */
export async function bootIn(role: string, hours = 0): Promise<BootProbe> {
  vi.stubEnv('APP_ROLE', role);
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  const probe: BootProbe = { jobTimers: new Map(), otherTimers: new Set(), tickers: [] };
  const current = watchJobs(probe);
  watchTimer('setTimeout', probe, current);
  watchTimer('setInterval', probe, current);
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await vi.advanceTimersByTimeAsync(hours * 3_600_000);
  await app.close();
  return probe;
}
