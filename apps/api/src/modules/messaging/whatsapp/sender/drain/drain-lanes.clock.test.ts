import { describe, expect, it, vi } from 'vitest';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import type { MessageWorker, PassJob } from '@/modules/messaging/whatsapp/sender/message.worker';
import { emptySummary } from '@/modules/messaging/whatsapp/sender/pass';
import { CLAIM_LEASE_MS } from '@/modules/messaging/whatsapp/sender/send-plan';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { drainLanes, type PassItem } from './drain-lanes';
import { LaneLocks } from './lane-locks';

// #695 review, item 1: each row's now is read when its turn comes, not at the pass start, so a lane
// that waited on its lock longer than the claim lease still claims with a lease in the future.

const NOW = new Date('2026-11-07T08:00:00Z');
const WAITED_MS = CLAIM_LEASE_MS + 60_000;
const item = (id: string): PassItem => ({
  job: { row: dueMessage({ id }), template: null, now: NOW } satisfies PassJob,
  pause: 'notifications',
});

function setup() {
  let ms = NOW.getTime();
  const seen: Date[] = [];
  const worker = {
    process: vi.fn(async (job: PassJob) => {
      seen.push(job.now);
      return 'sent';
    }),
    deferRest: vi.fn(async () => undefined),
  };
  const gate = { switches: vi.fn(async () => ({ open: true, automaticOn: true })) };
  const deps = {
    gate: gate as unknown as SendGate, worker: worker as unknown as MessageWorker,
    locks: new LaneLocks(), pooled: new Set<string>(), size: 1, clock: () => ms,
  };
  const advance = (by: number) => { ms += by; };
  return { deps, seen, advance, run: { summary: emptySummary(), paused: new Set<string>() } };
}

describe('drainLanes — the row clock', () => {
  it('a lane that waited on its lock past the lease still claims with a future lease', async () => {
    const t = setup();
    let release = (): void => undefined;
    const blocker = new Promise<void>((r) => { release = r; });
    const held = t.deps.locks.run('notifications', () => blocker);
    const drained = drainLanes(t.deps, t.run, [item('m1')]);
    t.advance(WAITED_MS); // the other ticker's drain of this key takes 3 minutes
    release();
    await Promise.all([held, drained]);
    expect(t.seen).toEqual([new Date(NOW.getTime() + WAITED_MS)]);
    const lease = (t.seen[0]?.getTime() ?? 0) + CLAIM_LEASE_MS;
    expect(lease).toBeGreaterThan(NOW.getTime() + WAITED_MS);
  });

  it('no wait: the row keeps the pass now', async () => {
    const t = setup();
    await drainLanes(t.deps, t.run, [item('m1')]);
    expect(t.seen).toEqual([NOW]);
  });
});
