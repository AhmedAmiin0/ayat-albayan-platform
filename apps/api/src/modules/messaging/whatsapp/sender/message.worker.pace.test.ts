import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { PushService } from '@/common/push/push.service';
import { EvolutionPacer } from '@/modules/messaging/whatsapp/drivers/evolution/evolution-pacer';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { resetPaceSlots, type EvolutionPaceRepo } from './pace';
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
    (isEvo(via) ? { waitMs: waitMs(row), dailyCap: 60, gapMs: 3_000 } : null);
  const dispatch = { send, ready: () => true, multi: true, pace };
  const queries = {
    claim: vi.fn(async () => 1), sent: vi.fn(async () => true),
    staffAtSend: vi.fn(async () => null),
  };
  const repo = {
    deferRecipient: vi.fn(async (_at: { id: string; numberId: string; phone: string; at: Date }) =>
      undefined),
    sentSince: vi.fn(async () => 0),
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
  beforeEach(() => vi.useFakeTimers({ now: NOW }));
  afterEach(() => {
    setNumbersOverlay(null);
    resetPaceSlots();
    vi.useRealTimers();
  });

  it('sends E1, moves E2 to later (3 s), and sends the Kapso row at once', async () => {
    const { w, send, repo } = harness();
    const started = performance.now();
    const go = (row: ReturnType<typeof text>, route: typeof EVO | typeof KAPSO) =>
      w.process({ row, template: null, now: NOW, autoOn: true, route });
    expect(await go(text('e1', '+966500000001'), EVO)).toBe('sent');
    expect(await go(text('e2', '+966500000002'), EVO)).toBe('skipped');
    expect(await go(text('k1', '+966500000003'), KAPSO)).toBe('sent');
    expect(performance.now() - started).toBeLessThan(1_000);
    const at = new Date(NOW.getTime() + 3_000);
    const e2 = { id: 'e2', numberId: 'evo-1', phone: '+966500000002', at };
    expect(repo.deferRecipient).toHaveBeenCalledWith(e2);
    expect(send.mock.calls.map((c) => c[0].phone_e164)).toEqual(['+966500000001', '+966500000003']);
  });

  it('the daily cap moves the row to the next UTC day', async () => {
    const { w, repo } = harness();
    repo.sentSince.mockResolvedValue(60);
    expect(await w.process({ row: text('e3', '+966500000004'), template: null, now: NOW, autoOn: true, route: EVO })).toBe('skipped');
    expect(repo.sentSince).toHaveBeenCalledWith('evo-1', new Date('2026-11-06T00:00:00Z'));
    const at = new Date('2026-11-07T00:00:00Z');
    const e3 = { id: 'e3', numberId: 'evo-1', phone: '+966500000004', at };
    expect(repo.deferRecipient).toHaveBeenCalledWith(e3);
  });

  it('a backlog spreads over its own slots, one gap apart (never one crowded batch)', async () => {
    const { w, repo } = harness();
    const go = (id: string, phone: string) =>
      w.process({ row: text(id, phone), template: null, now: NOW, autoOn: true, route: EVO });
    await go('a', '+966500000011');
    await go('b', '+966500000012');
    await go('c', '+966500000013');
    const offsets = repo.deferRecipient.mock.calls.map((c) => c[0].at.getTime() - NOW.getTime());
    expect(offsets).toEqual([3_000, 6_000]);
  });

  it('one conversation moves together: its later rows reuse its slot (order kept)', async () => {
    const { w, repo } = harness();
    const go = (id: string, phone: string) =>
      w.process({ row: text(id, phone), template: null, now: NOW, autoOn: true, route: EVO });
    await go('a', '+966500000021');
    await go('b1', '+966500000022');
    await go('c', '+966500000023');
    await go('b2', '+966500000022');
    const slots = repo.deferRecipient.mock.calls
      .map((c) => [c[0].phone, c[0].at.getTime() - NOW.getTime()]);
    expect(slots).toEqual([['+966500000022', 3_000], ['+966500000023', 6_000], ['+966500000022', 3_000]]);
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
