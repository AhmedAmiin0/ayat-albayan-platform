import { describe, expect, it, vi } from 'vitest';
import type { MessageSender } from '../sender/message.sender';
import { messageRow } from '../sender/sender.fakes';
import type { MessageViews } from './message.views';
import { MessagesService } from './messages.service';
import type { MessagesQueries } from './messages.queries';

// A failed request from the calls number (docs/28 §10) is never re-queued: staff tap again instead.

describe('MessagesService.retry and the calls number', () => {
  it('409 not_retryable, nothing requeued, the sender not kicked', async () => {
    const row = messageRow({ status: 'failed', line: 'calls', error_code: 'meta_131047' });
    const queries = { get: vi.fn().mockResolvedValue(row), requeue: vi.fn() };
    const sender = { kick: vi.fn() };
    const svc = new MessagesService(
      queries as unknown as MessagesQueries,
      {} as MessageViews,
      sender as unknown as MessageSender,
    );
    await expect(svc.retry(row.id, { automaticOn: true })).rejects.toMatchObject({ status: 409 });
    expect(queries.requeue).not.toHaveBeenCalled();
    expect(sender.kick).not.toHaveBeenCalled();
  });
});
