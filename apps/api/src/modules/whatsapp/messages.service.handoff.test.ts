import { describe, expect, it, vi } from 'vitest';
import type { MessageSender } from './message.sender';
import type { MessageViews } from './message.views';
import { MessagesService } from './messages.service';
import type { MessagesQueries } from './messages.queries';
import { messageRow } from './sender.fakes';

// M3 hand-off of a file staff sent from the chat (owner 2026-10-19 #2): wa.me cannot carry it.

const ID = 'b0000000-0000-4000-8000-000000000009';

function service(row: ReturnType<typeof messageRow>) {
  const queries = {
    get: vi.fn().mockResolvedValue(row),
    handOff: vi.fn().mockResolvedValue({ ...row, status: 'failed', error_code: 'handed_off' }),
    requeue: vi.fn().mockResolvedValue({ ...row, status: 'queued', error_code: null }),
  };
  const views = { view: vi.fn(async (r: unknown) => r) };
  const sender = { kick: vi.fn().mockResolvedValue(undefined) };
  const svc = new MessagesService(
    queries as unknown as MessagesQueries,
    views as unknown as MessageViews,
    sender as unknown as MessageSender,
  );
  return { svc, queries };
}

const media = { template_key: null, template_params: null, media_path: 'out/u1/r1/a.jpg', media_mime: 'image/jpeg' };

describe('MessagesService.handOff — sent files', () => {
  it('a failed media row: 409 media_handoff, the row is not held', async () => {
    const { svc, queries } = service(messageRow({ id: ID, status: 'failed', error_code: '131047', ...media }));
    await expect(svc.handOff(ID)).rejects.toMatchObject({ status: 409, response: { code: 'media_handoff' } });
    expect(queries.handOff).not.toHaveBeenCalled();
  });

  it('the same row can still be retried', async () => {
    const { svc, queries } = service(messageRow({ id: ID, status: 'failed', error_code: '131047', ...media }));
    await expect(svc.retry(ID, { automaticOn: true })).resolves.toMatchObject({ view: { status: 'queued' } });
    expect(queries.requeue).toHaveBeenCalledWith(ID);
  });

  it('a text row is still handed off', async () => {
    const { svc, queries } = service(messageRow({ id: ID, status: 'failed', template_key: null, body: 'السلام عليكم' }));
    await expect(svc.handOff(ID)).resolves.toMatchObject({ view: { error_code: 'handed_off' } });
    expect(queries.handOff).toHaveBeenCalledWith(ID);
  });
});
