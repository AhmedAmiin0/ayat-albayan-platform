import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOREIGN_PHONE,
  teachesOwnFamily,
  threadUrl,
} from '@/modules/messaging/inbox/foreign-id.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;

describe('POST /threads/:phone/reopen with another teacher\'s family', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachesOwnFamily(t);
    t.queries.thread.mockResolvedValue(threadRow({ phone_e164: FOREIGN_PHONE }));
  });

  const reopen = (phone: string, token: string) =>
    t.call({ method: 'POST', url: `${threadUrl(phone)}/reopen`, token });

  it('a teacher is 403 not_your_thread and that chat is never read', async () => {
    const res = await reopen(FOREIGN_PHONE, 'teacher');
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.queries.thread).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('the same teacher still opens a family they teach', async () => {
    t.queries.thread.mockResolvedValue(threadRow());
    expect((await reopen(PHONE, 'teacher')).statusCode).toBe(200);
    expect(t.queries.thread).toHaveBeenCalledWith(PHONE);
  });

  it('the admin is not narrowed by a teacher\'s scope', async () => {
    expect((await reopen(FOREIGN_PHONE, 'admin')).statusCode).toBe(200);
    expect(t.teacher.phones).not.toHaveBeenCalled();
  });
});
