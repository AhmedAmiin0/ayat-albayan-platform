import { readinessSchema, type CheckState, type JobBeat, type Readiness } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { staleNames } from '@/common/jobs/beats';
import { rollup } from './readiness.rollup';

/** What /ready reads; the module builds it from the DB client, the cache store and the beats. */
export interface ReadinessDeps {
  /** One tiny query under a short timeout; rejects when the database is down or slow. */
  ping: () => Promise<void>;
  /** off (no REDIS_URL), ok (connected) or degraded. */
  redis: () => CheckState;
  /** Every job's heartbeat, or null when this process cannot see them. */
  beats: () => Promise<JobBeat[] | null>;
  /** The server clock. */
  now: () => number;
}

export const READINESS_DEPS = Symbol('READINESS_DEPS');

const jobsCheck = (stale: number | null): ReadinessChecks['jobs'] =>
  stale === null ? { status: 'off', stale: 0 } : { status: stale ? 'degraded' : 'ok', stale };

type ReadinessChecks = Readiness['checks'];

/** GET /ready: can this copy serve? Database, then Redis and the jobs (docs/09 «Readiness»). */
@Injectable()
export class ReadinessService {
  constructor(@Inject(READINESS_DEPS) private readonly deps: ReadinessDeps) {}

  async check(): Promise<Readiness> {
    const [database, beats] = await Promise.all([this.database(), this.deps.beats()]);
    const stale = beats ? staleNames(beats, this.deps.now()).length : null;
    const checks = { database, redis: { status: this.deps.redis() }, jobs: jobsCheck(stale) };
    return readinessSchema.parse({ status: rollup(checks), checks });
  }

  private async database(): Promise<ReadinessChecks['database']> {
    const start = this.deps.now();
    const status = await this.deps.ping().then(
      (): CheckState => 'ok',
      (): CheckState => 'down',
    );
    return { status, ms: Math.max(0, this.deps.now() - start) };
  }
}
