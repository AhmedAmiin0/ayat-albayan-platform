import { describe, expect, it, vi } from 'vitest';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import type { MessageViews } from './message.views';
import { MessagesRepo } from './messages.repo';
import { MessagesService } from './messages.service';

// Owner 2026-11-06: a staff retry of a held text that failed (reopen_*) starts its 7-day hold
// again from the retry, held at once (never tried as free text), not from the old created_at.

function serviceOf(errorCode: string) {
  const row = messageRow({ status: 'failed', line: 'chat', error_code: errorCode });
  const queries = { get: vi.fn().mockResolvedValue(row), requeue: vi.fn().mockResolvedValue(row) };
  const views = { view: vi.fn().mockResolvedValue({}) };
  const svc = new MessagesService(
    queries as unknown as MessagesRepo,
    views as unknown as MessageViews,
    { kick: vi.fn(async () => undefined) } as unknown as MessageSender,
  );
  return { svc, queries, row };
}

describe('MessagesService.retry: a held text restarts its hold', () => {
  it.each(['reopen_failed', 'reopen_tries_used', 'reopen_unavailable'])('%s: requeued with a restart time', async (code) => {
    const { svc, queries, row } = serviceOf(code);
    await svc.retry(row.id, { automaticOn: true });
    expect(queries.requeue).toHaveBeenCalledWith(row.id, expect.any(Date));
  });

  it('any other failure: a plain requeue (no restart)', async () => {
    const { svc, queries, row } = serviceOf('network');
    await svc.retry(row.id, { automaticOn: true });
    expect(queries.requeue).toHaveBeenCalledWith(row.id, null);
  });
});

describe('MessagesRepo.requeue with a restart', () => {
  const update = (calls: { method: string; args: unknown[] }[]) =>
    calls.find((c) => c.method === 'update')?.args[0];

  it('held again from the retry: AWAITING_REPLY, scheduled_for = the retry, no old deadline', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: null }] });
    await new MessagesRepo(db).requeue('m1', new Date('2026-11-20T10:00:00Z'));
    expect(update(calls)).toMatchObject({
      status: 'queued',
      error_code: 'awaiting_reply',
      scheduled_for: '2026-11-20T10:00:00.000Z',
      expires_at: null,
    });
  });

  it('without a restart: today\'s update, scheduled_for and expires_at untouched', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: null }] });
    await new MessagesRepo(db).requeue('m1');
    expect(update(calls)).toEqual({ status: 'queued', attempts: 0, next_attempt_at: null, error_code: null, error_text: null });
  });
});
