import { threadReadRoutes as routes } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnNumbers } from '@/modules/messaging/numbers';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const T = '2026-11-06T10:00:00.123456+00:00';
const ID = 'c0000000-0000-4000-8000-000000000001';

describe('GET /threads/sync on its shared route object', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(t.app.get(OwnNumbers), 'phones').mockResolvedValue(new Set());
    t.sync.page.mockResolvedValue([messageRow({ id: ID, phone_e164: PHONE, updated_at: T })]);
    t.sync.tombstones.mockResolvedValue([]);
    t.queries.list.mockResolvedValue({ items: [threadRow()], total: 1 });
    t.queries.familyTags.mockResolvedValue(new Map());
    t.queries.unsupported.mockImplementation(async (rows: unknown[]) => rows);
  });

  it('answers a page its route reads, every view field kept', async () => {
    const res = await t.call({ method: 'GET', url: '/threads/sync?limit=20' });
    expect(res.statusCode).toBe(200);
    const answer = routes.sync.response.parse(res.json());
    expect(answer.messages[0]).toMatchObject({ id: ID, updated_at: T, direction: 'outbound' });
    expect(answer.threads[0]).toMatchObject({ phone_e164: PHONE });
  });

  it('refuses a bad cursor or limit before reading', async () => {
    for (const url of ['/threads/sync?since=x', '/threads/sync?limit=0']) {
      const res = await t.call({ method: 'GET', url });
      expect([res.statusCode, res.json().code]).toEqual([400, 'validation_failed']);
    }
    expect(t.sync.page).not.toHaveBeenCalled();
  });

  it('sits beside the chat path: the static segment wins', async () => {
    const res = await t.call({ method: 'GET', url: '/threads/sync' });
    expect(res.statusCode).toBe(200);
    expect(t.queries.thread).not.toHaveBeenCalled();
  });
});
