import type { ProbeAnswer } from '../../../core/http';
import { MaintenanceOnSchema } from '../maintenance.schema';
import type {
  MaintenanceFacts,
  MaintenanceProbes,
  MaintenanceView,
  MaintenanceViewer,
} from './maintenance.types';

/** The query both platforms share (one request, however many hooks read it). */
export const MAINTENANCE_QUERY_KEY = ['maintenance'] as const;
/** The wait before asking a silent API a second time. */
export const MAINTENANCE_CONFIRM_MS = 2_000;
const FAST_POLL_MS = 10_000;
const CALM_POLL_MS = 60_000;

type AnswerKind = 'ok' | 'other' | 'gone';
const GONE_STATUSES = new Set([502, 503, 504]);
const isSuccess = (status: number): boolean => status >= 200 && status < 300;
const okOrOther = (status: number): AnswerKind => (isSuccess(status) ? 'ok' : 'other');
const statusKind = (status: number): AnswerKind =>
  GONE_STATUSES.has(status) ? 'gone' : okOrOther(status);
const kindOf = (answer: ProbeAnswer | null): AnswerKind =>
  answer === null ? 'gone' : statusKind(answer.status);

const unsure = (why: string): never => {
  throw new Error(`maintenance: ${why}; keeping the last verdict`);
};
/** ok → the verdict; other (4xx, 500) → keep the last one; gone → ask again (null). */
const FROM_KIND: Record<AnswerKind, (body: unknown) => MaintenanceFacts | null> = {
  ok: (body) => ({ flag: MaintenanceOnSchema.safeParse(body).success, down: false }),
  other: () => unsure('the API refused'),
  gone: () => null,
};
const readAnswer = (answer: ProbeAnswer | null): MaintenanceFacts | null =>
  FROM_KIND[kindOf(answer)](answer?.body);

const OUTAGE: MaintenanceFacts = { flag: false, down: true };

async function assertReachable(
  first: ProbeAnswer | null,
  probes: MaintenanceProbes,
): Promise<void> {
  const reachable = first !== null || (await probes.deviceOnline());
  if (!reachable) unsure('the device is offline');
}

/**
 * The facts behind the screen. A 502/503/504 or no answer is asked once more after a pause, and
 * only a second silence is an outage; no answer while the device itself is offline throws (the
 * query keeps its last verdict), as does a 4xx/500. The API is asked at most twice.
 */
export async function maintenanceFacts(probes: MaintenanceProbes): Promise<MaintenanceFacts> {
  const first = await probes.api();
  const facts = readAnswer(first);
  if (facts) return facts;
  await assertReachable(first, probes);
  await probes.pause();
  return readAnswer(await probes.api()) ?? OUTAGE;
}

const coverOf = (covered: boolean): MaintenanceView => (covered ? 'maintenance' : 'open');
const viewOf = (facts: MaintenanceFacts, bypass: boolean): MaintenanceView =>
  facts.down ? 'down' : coverOf(facts.flag && !bypass);

/** A lesson room or an unknown verdict stays open; an outage covers everyone, admins too. */
export function maintenanceView(
  facts: MaintenanceFacts | undefined,
  viewer: MaintenanceViewer,
): MaintenanceView {
  if (viewer.inRoom || !facts) return 'open';
  return viewOf(facts, viewer.bypass);
}

const isHealthy = (facts: MaintenanceFacts | undefined): boolean =>
  facts !== undefined && !facts.flag && !facts.down;

/** Ask every 10 s while unknown, switched on or down; every 60 s while healthy. */
export const maintenancePollMs = (facts: MaintenanceFacts | undefined): number =>
  isHealthy(facts) ? CALM_POLL_MS : FAST_POLL_MS;
