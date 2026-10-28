import { appRole, runsJobs } from './app-role';
import { kickWorker } from './worker-kick';

type Method = (this: unknown, ...args: unknown[]) => unknown;
type JobClass = abstract new (...args: never[]) => object;

interface BackgroundJobOptions {
  /** The job's name in the internal kick route (/internal/jobs/:name/kick). */
  name: string;
  /** Its «run now» method, called from request handlers (an enqueue, an admin retry). */
  kick?: string;
}

/** The jobs a request may kick, by name: the worker's kick route looks them up here. */
const KICKABLE = new Map<string, { job: JobClass; method: string }>();

export const kickable = (name: string): { job: JobClass; method: string } | undefined =>
  KICKABLE.get(name);

/** Every @BackgroundJob class, by name: the boot test checks each one is off in `api` and on in `worker`. */
const JOBS = new Map<string, JobClass>();

export const backgroundJobs = (): ReadonlyMap<string, JobClass> => JOBS;

function wrap(proto: Record<string, unknown>, key: string, elsewhere: () => unknown): void {
  const own = proto[key];
  if (typeof own !== 'function') throw new Error(`@BackgroundJob: ${key}() is missing`);
  const local = own as Method;
  proto[key] = function gated(this: unknown, ...args: unknown[]): unknown {
    return runsJobs(appRole()) ? local.apply(this, args) : elsewhere();
  };
}

/**
 * The one switch of the process roles (docs/09): a job's timers start in onApplicationBootstrap, which
 * runs only where APP_ROLE runs jobs (worker, all). In an `api` process it does nothing, and the job's
 * `kick` (if named) goes to the worker over the internal network instead of running here, so two API
 * copies never run the outbox sender, the reminders or the Google sync, and PDFs never render beside
 * requests. The role is read on every call (tests set APP_ROLE). The rows' claims and dedup keys stay
 * as the second wall. Event listeners (onModuleInit) are request-driven and are not gated.
 */
export function BackgroundJob(opts: BackgroundJobOptions): (job: JobClass) => void {
  return (job) => {
    const proto = job.prototype as unknown as Record<string, unknown>;
    if (JOBS.has(opts.name)) throw new Error(`@BackgroundJob: ${opts.name} is declared twice`);
    wrap(proto, 'onApplicationBootstrap', () => undefined);
    JOBS.set(opts.name, job);
    if (!opts.kick) return;
    wrap(proto, opts.kick, () => kickWorker(opts.name));
    KICKABLE.set(opts.name, { job, method: opts.kick });
  };
}
