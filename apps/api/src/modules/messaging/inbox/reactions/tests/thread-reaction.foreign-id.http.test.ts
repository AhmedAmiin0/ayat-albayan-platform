import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOREIGN_MESSAGE,
  FOREIGN_PHONE,
  teachesOwnFamily,
  threadUrl,
} from '@/modules/messaging/inbox/foreign-id.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';
import { REQ } from '@/modules/messaging/inbox/reactions/reaction.fakes';
import { ReactionRepo } from '@/modules/messaging/inbox/reactions/reaction.repo';

type App = Awaited<ReturnType<typeof inboxApp>>;
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const put = (phone: string, token: string) => ({
  method: 'PUT' as const,
  url: `${threadUrl(phone)}/messages/${FOREIGN_MESSAGE}/reaction`,
  token,
  body: { emoji: '👍', clientRequestId: REQ },
});

describe('PUT /threads/:phone/messages/:id/reaction with another user\'s ids', () => {
  let t: App;
  let rq: ReactionRepo;
  beforeAll(async () => {
    t = await inboxApp();
    rq = t.app.get(ReactionRepo);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachesOwnFamily(t);
    vi.spyOn(rq, 'target').mockResolvedValue(null);
    vi.spyOn(rq, 'queued').mockResolvedValue(false);
    vi.spyOn(rq, 'setOurs').mockResolvedValue();
    vi.spyOn(rq, 'supersede').mockResolvedValue();
    t.queries.thread.mockResolvedValue(
      threadRow({ last_inbound_at: FRESH, last_notifications_inbound_at: FRESH }),
    );
  });

  const nothingWritten = () => {
    expect(rq.setOurs).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  };

  it('a teacher on another teacher\'s family is 403 and the message is never read', async () => {
    const res = await t.call(put(FOREIGN_PHONE, 'teacher'));
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(rq.target).not.toHaveBeenCalled();
    nothingWritten();
  });

  it('a salesperson reacting to another chat\'s message under this phone is 404', async () => {
    const res = await t.call(put(PHONE, 'sales'));
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    expect(rq.target).toHaveBeenCalledWith(PHONE, FOREIGN_MESSAGE);
    nothingWritten();
  });

  it('a teacher reacting to another chat\'s message under their own family is 404', async () => {
    const res = await t.call(put(PHONE, 'teacher'));
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    nothingWritten();
  });
});
