import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnNumbers } from '../../numbers';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp } from '../test-app';

// GET /threads for every role hides the academy's own numbers (owner 2026-10-27). Example numbers only.
type App = Awaited<ReturnType<typeof inboxApp>>;
const OWN = '+966500000009';
const LIST = '0c000000-0000-4000-8000-000000000001';

describe('GET /threads — the academy’s own numbers are never a chat', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(t.app.get(OwnNumbers), 'phones').mockResolvedValue(new Set([OWN]));
    t.queries.list.mockResolvedValue({ items: [threadRow()], total: 1 });
    t.queries.familyTags.mockResolvedValue(new Map());
    t.teacher.teacher.mockResolvedValue({ id: 'tch-1', display_name_ar: 'أبرار', phone_e164: '+201001234567' });
    t.teacher.phones.mockResolvedValue([PHONE]);
    t.teacher.unread.mockResolvedValue(new Map());
  });

  it('admin, sales and teacher lists, search and the unread count all hide them', async () => {
    const urls = ['/threads', '/threads?search=أكاديمية', '/threads?unread=true&page=1&pageSize=1', `/threads?list=${LIST}`];
    for (const token of ['admin', 'sales', 'teacher']) {
      for (const url of urls) expect((await t.call({ method: 'GET', url, token })).statusCode).toBe(200);
    }
    // 12 requests, 11 reads: a teacher with nothing unread of their own gets the empty page without one.
    expect(t.queries.list).toHaveBeenCalledTimes(11);
    for (const [f] of t.queries.list.mock.calls) expect(f).toMatchObject({ hide: [OWN] });
  });

  it('none of our numbers known: the filter is the old one', async () => {
    vi.spyOn(t.app.get(OwnNumbers), 'phones').mockResolvedValue(new Set());
    await t.call({ method: 'GET', url: '/threads' });
    expect(t.queries.list.mock.calls[0]?.[0]).not.toHaveProperty('hide');
  });
});
