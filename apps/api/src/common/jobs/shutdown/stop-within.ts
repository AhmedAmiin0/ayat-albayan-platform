import { Logger } from '@nestjs/common';

/** Below Docker's 30 s stop_grace_period (deploy/staging/docker-compose.yml). */
export const SHUTDOWN_BOUND_MS = 20_000;

interface Stoppable { stop: () => Promise<unknown> }
type StopOutcome = 'stopped' | 'timed-out';

const log = new Logger('Shutdown');
const report: Record<StopOutcome, (ms: number) => void> = {
  stopped: () => undefined,
  'timed-out': (ms) => log.warn(`run still going after ${String(ms)} ms; exiting`),
};

/**
 * Awaits a job's stop (its run in flight) in beforeApplicationShutdown, bounded: a hung pass must
 * not hold the process until Docker kills it mid-write.
 */
export async function stopWithin(job: Stoppable, ms = SHUTDOWN_BOUND_MS): Promise<StopOutcome> {
  let timer: NodeJS.Timeout | undefined;
  const bound = new Promise<StopOutcome>((resolve) => {
    timer = setTimeout(() => resolve('timed-out'), ms);
  });
  const stopped = job.stop().then(
    (): StopOutcome => 'stopped',
    (): StopOutcome => 'stopped',
  );
  const outcome = await Promise.race([stopped, bound]);
  clearTimeout(timer);
  report[outcome](ms);
  return outcome;
}
