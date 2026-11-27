import { threadReadRoutes as routes } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnNumbers } from '@/modules/messaging/numbers';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const ID = 'c0000000-0000-4000-8000-000000000001';

describe('GET /threads on its shared route object', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(t.app.get(OwnNumbers), 'phones').mockResolvedValue(new Set());
    const row = threadRow({ last_message_id: ID, lead_id: ID });
    t.queries.list.mockResolvedValue({ items: [row], total: 1 });
    t.queries.familyTags.mockResolvedValue(new Map());
    t.queries.unsupported.mockImplementation(async (rows: unknown[]) => rows);
  });

  it('answers a page its route reads', async () => {
    const res = await t.call({ method: 'GET', url: '/threads?unread=true&sort=name&dir=asc' });
    expect(res.statusCode).toBe(200);
    const page = routes.list.response.parse(res.json());
    expect([page.total, page.items[0]?.phone_e164]).toEqual([1, PHONE]);
    expect(t.queries.list).toHaveBeenCalledWith(
      expect.objectContaining({ unread: true, sort: 'name', dir: 'asc', page: 1, pageSize: 25 }),
    );
  });

  it('refuses an unknown sort or stage before reading', async () => {
    for (const url of ['/threads?sort=phone_e164', '/threads?status=nope', '/threads?unread=1']) {
      const res = await t.call({ method: 'GET', url });
      expect([res.statusCode, res.json().code]).toEqual([400, 'validation_failed']);
    }
    expect(t.queries.list).not.toHaveBeenCalled();
  });
});
