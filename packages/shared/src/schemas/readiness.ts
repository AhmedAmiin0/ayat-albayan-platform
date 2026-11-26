import { z } from 'zod';

// GET /ready (docs/09 «Readiness»): the deploy gate and an outside uptime monitor read it. /health
// stays the liveness probe. Public: statuses and counts only, never an error text or a job name.

export const READY_STATES = ['ok', 'degraded', 'down'] as const;
export const readyStateSchema = z.enum(READY_STATES);
export type ReadyState = z.infer<typeof readyStateSchema>;

/** `off`: not configured here (no REDIS_URL), or not readable from this process (jobs). */
export const CHECK_STATES = ['ok', 'degraded', 'down', 'off'] as const;
export const checkStateSchema = z.enum(CHECK_STATES);
export type CheckState = z.infer<typeof checkStateSchema>;

const check = z.object({ status: checkStateSchema });

export const readinessChecksSchema = z.object({
  /** One tiny query through the API's database client, under a short timeout. */
  database: check.extend({ ms: z.number().nonnegative() }),
  /** Only a cache: its failure is `degraded`, never `down`. */
  redis: check,
  /** Background jobs whose last success is older than a few intervals. */
  jobs: check.extend({ stale: z.int().nonnegative() }),
});
export type ReadinessChecks = z.infer<typeof readinessChecksSchema>;

export const readinessSchema = z.object({
  status: readyStateSchema,
  checks: readinessChecksSchema,
});
export type Readiness = z.infer<typeof readinessSchema>;

const epochMs = z.int().nonnegative();

/** One job's heartbeat as the worker stores it (epoch ms from the worker's clock). */
export const jobBeatSchema = z.object({
  name: z.string().min(1).max(100),
  everyMs: z.int().positive(),
  /** When the first run was due: a job that never succeeded counts from here. */
  since: epochMs,
  lastOkAt: epochMs.nullable(),
  lastErrorAt: epochMs.nullable(),
  lastError: z.string().max(500).nullable(),
});
export type JobBeat = z.infer<typeof jobBeatSchema>;

export const jobBeatsSchema = z.array(jobBeatSchema);

/** GET /admin/jobs: one row per job, snake_case like the rest of the API. */
export const jobStatusSchema = z.object({
  name: z.string(),
  every_ms: z.int().positive(),
  last_ok_at: z.iso.datetime().nullable(),
  last_error_at: z.iso.datetime().nullable(),
  last_error: z.string().nullable(),
  stale: z.boolean(),
});
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobStatusListSchema = z.object({ data: z.array(jobStatusSchema) });
export type JobStatusList = z.infer<typeof jobStatusListSchema>;
