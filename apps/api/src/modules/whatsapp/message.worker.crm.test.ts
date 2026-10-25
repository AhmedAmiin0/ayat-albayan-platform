import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../common/push/push.service';
import { crmErrorFrom } from './crm-http';
import { crmFailure } from './crm.fakes';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { CRM_AUTH, CRM_RATE_LIMITED } from './send-plan';
import { dueMessage } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { templateRow } from './whatsapp.fakes';

// docs/19 «crm driver» in the worker: a 429 waits (line paused this pass) without the token alarm.

const queries = { claim: vi.fn(), sent: vi.fn(), failure: vi.fn(), expire: vi.fn(), staffAtSend: vi.fn() };
const dispatch = { send: vi.fn(), ready: vi.fn(), multi: false };
const push = { notifyAdmins: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const answer = (status: number, code: string, retryAfter: string | null = null) =>
  crmErrorFrom({ status, text: JSON.stringify(crmFailure(status, code).body), retryAfter });

function worker() {
  return new MessageWorker(queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch, push as unknown as PushService);
}

describe('MessageWorker — crm failures', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dispatch.ready.mockReturnValue(true);
    queries.claim.mockResolvedValue(1);
  });

  it('429: queued until Retry-After, try not counted, line paused, and NO «token refused» push', async () => {
    dispatch.send.mockRejectedValue(answer(429, 'rate_limited', '30'));
    await expect(worker().process({ row: dueMessage(), template: templateRow(), now: NOW, autoOn: true })).resolves.toBe('paused');
    expect(queries.failure).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: 'queued', error_code: CRM_RATE_LIMITED, attempts: 0 }));
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('401: the credential hold still pushes once (per line per day)', async () => {
    dispatch.send.mockRejectedValue(answer(401, 'unauthorized'));
    await expect(worker().process({ row: dueMessage(), template: templateRow(), now: NOW, autoOn: true })).resolves.toBe('paused');
    expect(queries.failure).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ error_code: CRM_AUTH }));
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
  });
});
