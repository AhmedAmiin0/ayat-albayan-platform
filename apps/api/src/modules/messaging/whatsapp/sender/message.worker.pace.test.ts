import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { PushService } from '@/common/push/push.service';
import { EvolutionPacer } from '@/modules/messaging/whatsapp/drivers/evolution/evolution-pacer';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import type { EvolutionPaceRepo } from './pace';
import { dueMessage } from './sender.fakes';
import type { SenderRepo } from './sender.repo';

// docs/19 «Evolution driver» (field report): the Baileys pace must never stall the one sender.
// A paced Evolution row is moved to later and the pass goes on: a Kapso row queued after two
// Evolution rows is sent at once, with no sleep. A row pinned to an Evolution number that is off
// fails with a clear code instead of being skipped forever.

const NOW = new Date('2026-11-06T08:00:00Z');
const EVO = { numberId: 'evo-1', line: 'chat' as const };
const KAPSO = { numberId: 'kapso-1', line: 'notifications' as const };
const STAFF = '00000000-0000-4000-8000-0000000000aa';

function harness() {
  const pacer = new EvolutionPacer({ now: () => NOW.getTime() });
  interface Row { phone_e164: string }
  const isEvo = (via: { numberId: string }) => via.numberId === EVO.numberId;
  const send = vi.fn(async (row: Row, _t: unknown, via: { numberId: string }) => {
    if (isEvo(via)) pacer.mark({ key: 'evo', to: row.phone_e164 });
    return { waMessageId: `wamid.${row.phone_e164}` };
  });
  const waitMs = (row: Row) => pacer.waitMs({ key: 'evo', to: row.phone_e164, gapMs: 3_000 });
  const pace = (row: Row, via: { numberId: string }) =>
    (isEvo(via) ? { waitMs: waitMs(row), dailyCap: 60 } : null);
  const dispatch = { send, ready: () => true, multi: true, pace };
  const queries = {
    claim: vi.fn(async () => 1), sent: vi.fn(async () => true),
    staffAtSend: vi.fn(async () => null),
  };
  const repo = {
    defer: vi.fn(async () => undefined), sentSince: vi.fn(async () => 0),
    failOff: vi.fn(async () => undefined),
  };
  const push = { notifyAdmins: vi.fn() } as unknown as PushService;
  const w = new MessageWorker(
    queries as unknown as SenderRepo, dispatch as unknown as MessageDispatch, push,
  );
  Object.assign(w, { pace: repo as unknown as EvolutionPaceRepo });
  w.wait = vi.fn(async () => undefined);
  return { w, send, repo };
}

const text = (id: string, phone: string) =>
  dueMessage({ id, phone_e164: phone, template_key: null, template_params: null, body: 'نص', created_by: STAFF, lesson_id: null });

describe('MessageWorker — Evolution pacing never blocks other lines', () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => setNumbersOverlay(null));

  it('sends E1, moves E2 to later (3 s), and sends the Kapso row at once', async () => {
    const { w, send, repo } = harness();
    const started = Date.now();
    const go = (row: ReturnType<typeof text>, route: typeof EVO | typeof KAPSO) =>
      w.process({ row, template: null, now: NOW, autoOn: true, route });
    expect(await go(text('e1', '+966500000001'), EVO)).toBe('sent');
    expect(await go(text('e2', '+966500000002'), EVO)).toBe('skipped');
    expect(await go(text('k1', '+966500000003'), KAPSO)).toBe('sent');
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(repo.defer).toHaveBeenCalledWith('e2', new Date(NOW.getTime() + 3_000));
    expect(send.mock.calls.map((c) => c[0].phone_e164)).toEqual(['+966500000001', '+966500000003']);
  });

  it('the daily cap moves the row to the next UTC day', async () => {
    const { w, repo } = harness();
    repo.sentSince.mockResolvedValue(60);
    expect(await w.process({ row: text('e3', '+966500000004'), template: null, now: NOW, autoOn: true, route: EVO })).toBe('skipped');
    expect(repo.sentSince).toHaveBeenCalledWith('evo-1', new Date('2026-11-06T00:00:00Z'));
    expect(repo.defer).toHaveBeenCalledWith('e3', new Date('2026-11-07T00:00:00Z'));
  });

  it('a row pinned to an Evolution number that is off fails visibly (evolution_number_off)', async () => {
    const off = { id: 'evo-1', purpose: 'chat', enabled: false, env: null, evolution: true } as unknown as OverlayNumber;
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [off] });
    const { w, repo, send } = harness();
    const row = { ...text('e4', '+966500000005'), number_id: 'evo-1' };
    await w.process({ row, template: null, now: NOW, autoOn: true, route: null });
    expect(repo.failOff).toHaveBeenCalledWith('e4');
    expect(send).not.toHaveBeenCalled();
  });
});
