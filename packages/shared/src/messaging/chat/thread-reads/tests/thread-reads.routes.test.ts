import { describe, expect, it } from 'vitest';
import { threadReadRoutes as routes } from '..';
import { SYNC_LIMIT_DEFAULT, SYNC_LIMIT_MAX } from '../../../thread-sync';

const ID = 'c0000000-0000-4000-8000-000000000001';
const CURSOR = `2026-11-06T10:00:00.000001+00:00~${ID}`;
const PHONE = '+966500000001';
const STAMP = '2026-11-06T10:00:00.000001+00:00';
const MESSAGE = { id: ID, phone_e164: PHONE, created_at: STAMP, updated_at: STAMP, body: 'أهلًا' };
const THREAD = { phone_e164: PHONE, last_message_id: ID, unread_count: 2 };
const ANSWER = {
  messages: [MESSAGE],
  threads: [THREAD],
  gone: [],
  cursor: CURSOR,
  has_more: false,
  scope: 'admin:1',
};

describe('threadReadRoutes', () => {
  it('keeps the path of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /threads/sync']);
  });

  it('asks from the first row with the default page, or from a cursor read apart', () => {
    expect(routes.sync.query.parse({})).toEqual({ limit: SYNC_LIMIT_DEFAULT });
    expect(routes.sync.query.parse({ since: CURSOR, limit: '20' })).toEqual({
      since: { at: '2026-11-06T10:00:00.000001+00:00', id: ID },
      limit: 20,
    });
  });

  it('refuses a malformed cursor and a page over the cap', () => {
    expect(routes.sync.query.safeParse({ since: 'x' }).success).toBe(false);
    expect(routes.sync.query.safeParse({ limit: SYNC_LIMIT_MAX + 1 }).success).toBe(false);
    expect(routes.sync.query.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('answers the rows with every field of their views kept', () => {
    expect(routes.sync.response.parse(ANSWER)).toEqual(ANSWER);
  });

  it('refuses an answer whose row has no stamp or whose page says nothing of more', () => {
    const unstamped = { ...ANSWER, messages: [{ ...MESSAGE, updated_at: undefined }] };
    expect(routes.sync.response.safeParse(unstamped).success).toBe(false);
    const { has_more: _more, ...noMore } = ANSWER;
    expect(routes.sync.response.safeParse(noMore).success).toBe(false);
  });

  it('lets inbox.read in and tags the route inbox', () => {
    expect([routes.sync.permissions, routes.sync.tags]).toEqual([['inbox.read'], ['inbox']]);
  });
});
