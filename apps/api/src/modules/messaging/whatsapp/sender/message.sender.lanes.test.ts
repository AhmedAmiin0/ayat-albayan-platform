import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageSender } from './message.sender';
import type { MessageWorker } from './message.worker';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { dueMessage, fakeSwitches } from './sender.fakes';
import type { SenderRepo } from './sender.repo';

// docs/42 42-7: a kick names its lane; each lane's pass reads only its rows; the main timer pass
// that finds due rows also wakes the chat lane.

const gate = fakeSwitches();
const queries = {
  approvedTemplates: vi.fn(), due: vi.fn(), holdAutomatic: vi.fn(), anyDue: vi.fn(),
};
const worker = { process: vi.fn(), deferRest: vi.fn(), release: vi.fn(async () => 0) };
const NOW = new Date('2026-11-07T08:00:00Z');

const sender = () => new MessageSender(
  gate as unknown as SendGate, queries as unknown as SenderRepo, worker as unknown as MessageWorker,
);

describe('MessageSender lanes (docs/42 42-7)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([]);
    queries.anyDue.mockResolvedValue(true);
    queries.due.mockResolvedValue([dueMessage({ template_key: null, body: 'نص', line: 'chat' })]);
    worker.process.mockResolvedValue('sent');
    worker.release.mockResolvedValue(0);
  });

  it('kick({ lane: chat }) runs the chat lane only, without the probe', async () => {
    await sender().kick({ lane: 'chat' });
    expect(queries.due).toHaveBeenCalledTimes(1);
    expect(queries.due).toHaveBeenCalledWith(expect.objectContaining({ lane: 'chat', limit: 50 }));
    expect(queries.anyDue).not.toHaveBeenCalled();
  });

  it('a plain kick runs both lanes', async () => {
    await sender().kick();
    const lanes = queries.due.mock.calls.map(([input]) => (input as { lane: string }).lane).sort();
    expect(lanes).toEqual(['chat', 'main']);
  });

  it('a main timer pass with due rows wakes the chat lane; an idle one does not', async () => {
    const s = sender();
    const kick = vi.spyOn(s, 'kick').mockResolvedValue(undefined);
    await s.runOnce(NOW, { lane: 'main' });
    expect(kick).toHaveBeenCalledWith({ lane: 'chat' });
    kick.mockClear();
    queries.anyDue.mockResolvedValue(false);
    await s.runOnce(NOW, { lane: 'main' });
    expect(kick).not.toHaveBeenCalled();
  });

  it('a lane pass still reads the gate first and before the row', async () => {
    await sender().runOnce(NOW, { lane: 'chat', kicked: true });
    const [firstGate] = gate.open.mock.invocationCallOrder;
    expect(firstGate).toBeLessThan(queries.due.mock.invocationCallOrder[0] ?? 0);
    expect(gate.open).toHaveBeenCalledTimes(2);
  });
});
