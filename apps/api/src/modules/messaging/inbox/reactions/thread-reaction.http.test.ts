import { systemPermissionsOf } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionResolver } from '../../../../common/auth/permissions';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp } from '../test-app';
import { REQ, TARGET_ID, target } from './reaction.fakes';
import { ReactionQueries } from './reaction.queries';

// PUT /threads/:phone/messages/:id/reaction through the real guards (permissions, scopes, audit). The DB
// reads and the sender are mocks: no line client is ever called.

const URL = `/threads/${encodeURIComponent(PHONE)}/messages/${TARGET_ID}/reaction`;
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const put = (token: string, body: object = { emoji: '👍', clientRequestId: REQ }) => ({ method: 'PUT' as const, url: URL, token, body });
/** The system roles, but `sales` without inbox.send (a DB-edited role that may only read). */
const resolve: PermissionResolver = async (user) => {
  const base = user.role ? systemPermissionsOf(user.role) : [];
  return user.id === 's2' ? base.filter((p) => p !== 'inbox.send') : base;
};

describe('PUT …/reaction', () => {
  let t: Awaited<ReturnType<typeof inboxApp>>;
  let rq: ReactionQueries;
  beforeAll(async () => {
    t = await inboxApp(resolve);
    rq = t.app.get(ReactionQueries);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(rq, 'target').mockResolvedValue({ ...target(), created_at: FRESH });
    vi.spyOn(rq, 'queued').mockResolvedValue(false);
    vi.spyOn(rq, 'setOurs').mockResolvedValue();
    t.client.configured.mockReturnValue(true);
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH, last_notifications_inbound_at: FRESH }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'r1', status: 'queued' }));
    t.queries.get.mockImplementation(async (id: string) =>
      id === TARGET_ID ? messageRow({ id, direction: 'inbound', our_reaction: '👍', template_key: null, body: 'x' }) : messageRow({ id, status: 'sent', template_key: null }));
  });

  it('a salesperson reacts in any chat: 200, the reacted message, audited as a send', async () => {
    const res = await t.call(put('sales'));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'sent', message: { id: TARGET_ID, reactions: { ours: '👍', theirs: null } } });
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: `reaction:${TARGET_ID}:👍:sales:s1:${PHONE}:${REQ}`, created_by: 's1' }));
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'thread_reaction', actorId: 's1', after: expect.objectContaining({ sales_id: 's1' }) }));
  });

  it('403 without inbox.send, for a guardian, and 401 without a token; nothing written', async () => {
    expect((await t.call(put('salesB'))).statusCode).toBe(403);
    expect((await t.call(put('guardian'))).statusCode).toBe(403);
    expect((await t.call(put('nobody'))).statusCode).toBe(401);
    expect(rq.setOurs).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('400 for text instead of an emoji, a missing request id or a bad message id', async () => {
    expect((await t.call(put('admin', { emoji: 'ok', clientRequestId: REQ }))).statusCode).toBe(400);
    expect((await t.call(put('admin', { emoji: '👍' }))).statusCode).toBe(400);
    expect((await t.call({ ...put('admin'), url: `/threads/${encodeURIComponent(PHONE)}/messages/not-a-uuid/reaction` })).statusCode).toBe(400);
  });

  it('GET /threads/:phone carries thread.reactable (open window, not the CRM line)', async () => {
    t.queries.messages.mockResolvedValue([]);
    t.queries.markInboundRead.mockResolvedValue([]);
    const open = await t.call({ method: 'GET', url: `/threads/${encodeURIComponent(PHONE)}` });
    expect(open.json().thread.reactable).toBe(true);
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z', last_notifications_inbound_at: '2026-01-01T00:00:00Z' }));
    const closed = await t.call({ method: 'GET', url: `/threads/${encodeURIComponent(PHONE)}` });
    expect(closed.json().thread.reactable).toBe(false);
  });
});
