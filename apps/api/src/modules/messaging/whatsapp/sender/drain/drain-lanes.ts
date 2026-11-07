import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import type { MessageWorker, PassJob } from '@/modules/messaging/whatsapp/sender/message.worker';
import type { SendSummary } from '@/modules/messaging/whatsapp/sender/pass';
import type { LaneLocks } from './lane-locks';
import { phonePool, type PoolStop, type Step } from './phone-pool';

/** One due row of a pass and the line (legacy) or number (module mode) a pause applies to. */
export interface PassItem { job: PassJob; pause: string | null }
/** One runOnce: its counts and paused lines (numbers); the extra pass skips them too. */
export interface PassRun { summary: SendSummary; paused: Set<string> }

interface DrainDeps {
  gate: SendGate;
  worker: MessageWorker;
  locks: LaneLocks;
  /** Lane keys that may run `size` rows at once (pooled.ts); every other lane runs one. */
  pooled: ReadonlySet<string>;
  size: number;
}

interface Lane { run: PassRun; key: string; items: PassItem[] }

/** Rows with no pause key (module mode, no number can send them now) share one lane. */
const NO_PAUSE = '';

function lanesOf(items: readonly PassItem[]): Map<string, PassItem[]> {
  const lanes = new Map<string, PassItem[]>();
  for (const item of items) {
    const key = item.pause ?? NO_PAUSE;
    lanes.set(key, [...(lanes.get(key) ?? []), item]);
  }
  return lanes;
}

/**
 * One row: the switches (one UNCACHED read, docs/09, docs/26 26-P4) right before it, so OFF stops
 * every lane at its next row; then the worker. A broken token (or Meta's 131042) stops ITS lane.
 */
async function rowStep(deps: DrainDeps, run: PassRun, item: PassItem): Promise<Step> {
  const gate = await deps.gate.switches();
  if (!gate.open) return 'closed';
  const outcome = await deps.worker.process({ ...item.job, autoOn: gate.automaticOn });
  run.summary[outcome] += 1;
  return outcome === 'paused' && item.pause !== null ? 'paused' : 'next';
}

/** A paused lane: skipped for the rest of the run; a 131042-held line's rows deferred at once. */
async function onPaused(deps: DrainDeps, lane: Lane, stop: PoolStop<PassItem>): Promise<void> {
  lane.run.paused.add(lane.key);
  await deps.worker.deferRest(stop.item.job, stop.rest.map((o) => o.job.row));
}

async function drainLane(deps: DrainDeps, lane: Lane): Promise<void> {
  if (lane.run.paused.has(lane.key)) return;
  const stop = await phonePool({
    items: lane.items,
    size: deps.pooled.has(lane.key) ? deps.size : 1,
    phoneOf: (item) => item.job.row.phone_e164,
    step: (item) => rowStep(deps, lane.run, item),
  });
  if (stop?.why === 'paused') await onPaused(deps, lane, stop);
}

/**
 * docs/42 42-7: the pass's rows by lane key (a line, or a number), the lanes in parallel, each
 * under its lock (one drain per key across the tickers). Within a lane: queue order, one phone at a
 * time.
 */
export async function drainLanes(
  deps: DrainDeps,
  run: PassRun,
  items: readonly PassItem[],
): Promise<void> {
  const lanes = [...lanesOf(items)].map(([key, rows]) => ({ run, key, items: rows }));
  await Promise.all(lanes.map((lane) => deps.locks.run(lane.key, () => drainLane(deps, lane))));
}
