import { describe, expect, it, vi } from 'vitest';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import type { MessageWorker, PassJob } from '@/modules/messaging/whatsapp/sender/message.worker';
import { emptySummary } from '@/modules/messaging/whatsapp/sender/pass';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { drainLanes, type PassItem } from './drain-lanes';
import { LaneLocks } from './lane-locks';

// docs/42 42-7: lanes by pause key in parallel; the uncached gate before every row; a pause stops
// and defers only its own lane.

const NOW = new Date('2026-11-07T08:00:00Z');
const item = (id: string, pause: string | null, phone = `+9665000000${id.slice(-2)}`): PassItem => ({
  job: { row: dueMessage({ id, phone_e164: phone }), template: null, now: NOW } satisfies PassJob,
  pause,
});
const OPEN = { open: true, automaticOn: true };

function setup(process: (id: string) => Promise<string>) {
  const order: string[] = [];
  const gate = { switches: vi.fn(async () => { order.push('gate'); return OPEN; }) };
  const worker = {
    process: vi.fn(async (job: PassJob) => { order.push(job.row.id); return process(job.row.id); }),
    deferRest: vi.fn(async () => undefined),
  };
  const deps = {
    gate: gate as unknown as SendGate, worker: worker as unknown as MessageWorker,
    locks: new LaneLocks(), pooled: new Set<string>(), size: 1,
  };
  return { deps, gate, worker, order, run: { summary: emptySummary(), paused: new Set<string>() } };
}

describe('drainLanes', () => {
  it('a chat row goes while the notifications lane is stuck on a slow send (lane isolation)', async () => {
    let release = (): void => undefined;
    const slow = new Promise<string>((r) => { release = () => r('sent'); });
    const t = setup((id) => (id === 'n01' ? slow : Promise.resolve('sent')));
    const done = drainLanes(t.deps, t.run, [item('n01', 'notifications'), item('n02', 'notifications'), item('c01', 'chat')]);
    await vi.waitFor(() => expect(t.order).toContain('c01'));
    expect(t.order).not.toContain('n02');
    release();
    await done;
    expect(t.run.summary.sent).toBe(3);
  });

  it('the gate is read right before every row; closed stops every lane at its next row', async () => {
    const t = setup(async () => 'sent');
    const closed = { open: false, automaticOn: true };
    t.gate.switches.mockImplementation(async () => {
      t.order.push('gate');
      return t.order.filter((x) => x === 'gate').length > 1 ? closed : OPEN;
    });
    await drainLanes(t.deps, t.run, [item('n01', 'notifications'), item('n02', 'notifications')]);
    expect(t.order).toEqual(['gate', 'n01', 'gate']);
    expect(t.worker.process).toHaveBeenCalledTimes(1);
  });

  it('a paused row stops and defers only its lane; the other lane keeps sending', async () => {
    const t = setup(async (id) => (id === 'n01' ? 'paused' : 'sent'));
    const items = [item('n01', 'notifications'), item('c01', 'chat'), item('n02', 'notifications'), item('c02', 'chat')];
    await drainLanes(t.deps, t.run, items);
    expect(t.run.paused).toEqual(new Set(['notifications']));
    expect(t.worker.deferRest).toHaveBeenCalledWith(items[0]?.job, [items[2]?.job.row]);
    expect(t.order).toContain('c02');
    expect(t.order).not.toContain('n02');
  });

  it('a lane already paused this run is skipped (the extra pass)', async () => {
    const t = setup(async () => 'sent');
    t.run.paused.add('chat');
    await drainLanes(t.deps, t.run, [item('c01', 'chat')]);
    expect(t.worker.process).not.toHaveBeenCalled();
  });

  it('rows of one phone stay in order in a pooled lane', async () => {
    const t = setup(async () => 'sent');
    const deps = { ...t.deps, pooled: new Set(['notifications']), size: 4 };
    const phone = '+966500000099';
    await drainLanes(deps, t.run, [item('a01', 'notifications', phone), item('b01', 'notifications'), item('a02', 'notifications', phone)]);
    const rows = t.order.filter((x) => x !== 'gate');
    expect(rows.indexOf('a01')).toBeLessThan(rows.indexOf('a02'));
    expect(t.run.summary.sent).toBe(3);
  });
});
