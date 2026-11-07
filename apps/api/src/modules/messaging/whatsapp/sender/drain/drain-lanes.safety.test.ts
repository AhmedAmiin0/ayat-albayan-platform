import { describe, expect, it, vi } from 'vitest';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import type { MessageWorker, PassJob } from '@/modules/messaging/whatsapp/sender/message.worker';
import { emptySummary } from '@/modules/messaging/whatsapp/sender/pass';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { drainLanes, type PassItem } from './drain-lanes';
import { LaneLocks } from './lane-locks';

// Review of #695 (items 3, 4): an unreadable switch fails CLOSED; concurrency 4 never overlaps two
// rows of the chat lane or two rows of one phone; locks are held until every started row ends.

const NOW = new Date('2026-11-07T08:00:00Z');
const OPEN = { open: true, automaticOn: true };
const item = (id: string, pause: string, phone: string): PassItem => ({
  job: { row: dueMessage({ id, phone_e164: phone }), template: null, now: NOW } satisfies PassJob,
  pause,
});
const tick = () => new Promise<void>((r) => setTimeout(r, 2));

function setup(process: (job: PassJob) => Promise<string>) {
  const gate = { switches: vi.fn(async () => OPEN) };
  const worker = { process: vi.fn(process), deferRest: vi.fn(async () => undefined) };
  const locks = new LaneLocks();
  const deps = {
    gate: gate as unknown as SendGate, worker: worker as unknown as MessageWorker,
    locks, pooled: new Set(['notifications']), size: 4,
  };
  return { deps, gate, worker, locks, run: { summary: emptySummary(), paused: new Set<string>() } };
}

/** Records the peak of rows in flight per lane and per phone. */
function overlap() {
  const live = new Map<string, number>();
  const peak = new Map<string, number>();
  const bump = (key: string, by: number) => {
    const n = (live.get(key) ?? 0) + by;
    live.set(key, n);
    peak.set(key, Math.max(peak.get(key) ?? 0, n));
  };
  const process = async (job: PassJob): Promise<string> => {
    const keys = [job.row.line ?? 'notifications', job.row.phone_e164];
    keys.forEach((k) => bump(k, 1));
    await tick();
    keys.forEach((k) => bump(k, -1));
    return 'sent';
  };
  return { process, peak };
}

describe('drainLanes — safety', () => {
  it('a thrown switches read stops the lane like OFF: nothing is sent, nothing throws', async () => {
    const t = setup(async () => 'sent');
    t.gate.switches.mockRejectedValue(new Error('settings unreadable'));
    await expect(drainLanes(t.deps, t.run, [item('n01', 'notifications', '+966500000001')])).resolves.toBeUndefined();
    expect(t.worker.process).not.toHaveBeenCalled();
  });

  it('concurrency 4: two chat rows never overlap; one phone never overlaps in the pooled lane', async () => {
    const o = overlap();
    const t = setup(o.process);
    const chat = (id: string, phone: string) => ({
      ...item(id, 'chat', phone), job: { row: dueMessage({ id, phone_e164: phone, line: 'chat' }), template: null, now: NOW },
    });
    const items = [
      chat('c1', '+966500000011'), chat('c2', '+966500000012'), chat('c3', '+966500000013'),
      item('n1', 'notifications', '+966500000021'), item('n2', 'notifications', '+966500000021'),
      item('n3', 'notifications', '+966500000022'), item('n4', 'notifications', '+966500000023'),
    ];
    await drainLanes(t.deps, t.run, items);
    expect(o.peak.get('chat')).toBe(1);
    expect(o.peak.get('+966500000021')).toBe(1);
    expect(o.peak.get('notifications')).toBeGreaterThan(1);
    expect(t.run.summary.sent).toBe(7);
  });

  it('a row that throws keeps the lane lock until its in-flight siblings end, then rethrows', async () => {
    let release = (): void => undefined;
    const slow = new Promise<string>((r) => { release = () => r('sent'); });
    const t = setup((job) => (job.row.id === 'n1' ? Promise.reject(new Error('boom')) : slow));
    const items = [item('n2', 'notifications', '+966500000031'), item('n1', 'notifications', '+966500000032')];
    let settled = false;
    const done = drainLanes(t.deps, t.run, items).finally(() => { settled = true; });
    await vi.waitFor(() => expect(t.worker.process).toHaveBeenCalledTimes(2));
    await tick();
    expect(settled).toBe(false);
    expect(t.locks.busy).toBe(1);
    release();
    await expect(done).rejects.toThrow('boom');
  });
});
