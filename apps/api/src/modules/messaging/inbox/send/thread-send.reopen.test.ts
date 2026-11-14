import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateView } from '@ab/shared';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import type { ReopenPick, TemplateRegistry } from '@/modules/messaging/whatsapp';
import type { Outbox } from './outbox';
import { ThreadSendService, type ThreadSend } from './thread-send.service';
import type { ThreadTemplate } from '@ab/shared';

// «إعادة فتح المحادثة» (owner 2026-11-14): the existing template send, its permission checks
// first, then the reopen stamp. Fakes only: nothing is sent.

const NOW = new Date('2026-11-14T09:00:00Z');
const REQ = 'c0000000-0000-4000-8000-000000000001';
const STAMP = { dedup: `reopen:${PHONE}:2026-11-14`, expiresAt: '2026-11-15T09:00:00.000Z' };
const queries = { thread: vi.fn() };
const templates = { approved: vi.fn() };
const outbox = { queue: vi.fn() };
const stamp = vi.fn();
const tpl = (over: Partial<TemplateView> = {}) =>
  ({
    key: 'free_trial_invite', line: 'chat', params: [], buttons: [], header_format: null,
    status: 'approved', sales_starter: true, ...over,
  }) as unknown as TemplateView;

function service(): ThreadSendService {
  const s = new ThreadSendService(
    queries as unknown as ThreadsRepo,
    templates as unknown as TemplateRegistry,
    outbox as unknown as Outbox,
  );
  Object.assign(s, { reopens: { stamp } as unknown as ReopenPick });
  return s;
}
const input = { key: 'free_trial_invite', params: {}, clientRequestId: REQ, reopen: true };
const ask = (over: Partial<ThreadSend<ThreadTemplate>> = {}): ThreadSend<ThreadTemplate> => ({
  phone: PHONE, input, actorId: 'u1', restricted: true, ...over,
});
const queued = () => outbox.queue.mock.calls[0]?.[0] as Record<string, unknown>;

beforeEach(() => {
  vi.resetAllMocks();
  queries.thread.mockResolvedValue(threadRow()); // last inbound 2026-10-02: the window is closed
  templates.approved.mockResolvedValue(tpl());
  stamp.mockResolvedValue(STAMP);
  outbox.queue.mockImplementation(async (row: object) => ({ view: { id: 'm1', ...row }, replayed: false }));
});

describe('ThreadSendService.template with reopen', () => {
  it('closed window: queued under the reopen key with its 24 h expiry', async () => {
    await service().template(ask(), NOW);
    expect(stamp).toHaveBeenCalledWith({ phone: PHONE, line: 'chat', now: NOW });
    expect(queued()).toMatchObject({ dedup_key: STAMP.dedup, expires_at: STAMP.expiresAt });
  });

  it('open window: a plain template send under the client key', async () => {
    queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-11-14T08:00:00Z' }));
    await service().template(ask(), NOW);
    expect(stamp).not.toHaveBeenCalled();
    expect(queued().dedup_key).toBe(`admin:${PHONE}:${REQ}`);
    expect(queued()).not.toHaveProperty('expires_at');
  });

  it('no reopen flag: today\'s send, unchanged', async () => {
    await service().template(ask({ input: { ...input, reopen: undefined } }), NOW);
    expect(stamp).not.toHaveBeenCalled();
  });

  it('sales cannot reopen with a template off their list: 403, no stamp, nothing queued', async () => {
    templates.approved.mockResolvedValue(tpl({ key: 'renewal_notice', sales_starter: false }));
    await expect(
      service().template(ask({ input: { ...input, key: 'renewal_notice' } }), NOW),
    ).rejects.toMatchObject({ response: { code: 'template_not_allowed' } });
    expect(stamp).not.toHaveBeenCalled();
    expect(outbox.queue).not.toHaveBeenCalled();
  });

  it('a live reopen already: its 409 reaches the caller, nothing queued', async () => {
    stamp.mockRejectedValue(Object.assign(new Error('reopen_live'), { status: 409 }));
    await expect(service().template(ask(), NOW)).rejects.toThrow('reopen_live');
    expect(outbox.queue).not.toHaveBeenCalled();
  });
});
