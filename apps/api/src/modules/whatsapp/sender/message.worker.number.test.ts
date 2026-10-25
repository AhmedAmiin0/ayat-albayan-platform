import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../../common/integrations/numbers-overlay';
import type { PushService } from '../../../common/push/push.service';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { dueMessage } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { templateRow } from '../whatsapp.fakes';

// docs/23 phase 3: messages.number_id is stamped at claim in module mode only; legacy claims are unchanged.

const queries = { claim: vi.fn(), sent: vi.fn(), failure: vi.fn(), expire: vi.fn(), staffAtSend: vi.fn() };
const dispatch = { send: vi.fn(), ready: vi.fn(), multi: false };
const NOW = new Date('2026-10-02T08:00:00Z');

function run() {
  const w = new MessageWorker(queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch, { notifyAdmins: vi.fn() } as unknown as PushService);
  w.wait = vi.fn(async () => undefined);
  return w.process({ row: dueMessage(), template: templateRow(), now: NOW, autoOn: true });
}

describe('MessageWorker — the number of a row', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dispatch.ready.mockReturnValue(true);
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
    queries.claim.mockResolvedValue(1);
    queries.sent.mockResolvedValue(true);
  });
  afterEach(() => setNumbersOverlay(null));

  it('legacy: the claim carries no number (exactly today\'s update)', async () => {
    await expect(run()).resolves.toBe('sent');
    expect(queries.claim).toHaveBeenCalledWith({ id: dueMessage().id, attempts: 0, now: NOW });
  });

  it('module: the role\'s default number is stamped', async () => {
    setNumbersOverlay({ values: {}, numberIds: { notifications: 'num-1' } });
    await expect(run()).resolves.toBe('sent');
    expect(queries.claim).toHaveBeenCalledWith({ id: dueMessage().id, attempts: 0, now: NOW, numberId: 'num-1' });
  });
});
