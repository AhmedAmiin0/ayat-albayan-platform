import { describe, expect, it } from 'vitest';
import { threadReadRoutes as routes } from '..';

const ID = 'c0000000-0000-4000-8000-000000000001';
const AT = '2026-10-02T08:00:00Z';
const VIEW = {
  phone_e164: '+966501234567',
  display_name: 'أم ياسمين',
  last_message_id: ID,
  last_direction: 'inbound',
  last_body: null,
  last_template_key: null,
  last_status: 'delivered',
  last_media_mime: null,
  last_message_at: AT,
  last_inbound_at: null,
  unread_count: 0,
  lead_id: null,
  lead_name: null,
  lead_status: null,
  lead_source: null,
  guardian_id: null,
  guardian_name: null,
  guardian_tz: null,
  teacher_id: null,
  teacher_name: null,
  session_open: false,
  subscribed: false,
};

describe('threadReadRoutes.list', () => {
  it('asks the first page of 25, newest first, with no filter', () => {
    expect(routes.list.query.parse({})).toEqual({ page: 1, pageSize: 25, unread: false });
  });

  it('reads the filters, the sort and the trimmed words', () => {
    const query = { search: ' ياسمين ', unread: 'true', status: 'new', list: 'l1', sort: 'name' };
    expect(routes.list.query.parse({ ...query, dir: 'asc', page: '2', pageSize: '30' })).toEqual({
      search: 'ياسمين',
      unread: true,
      status: 'new',
      list: 'l1',
      sort: 'name',
      dir: 'asc',
      page: 2,
      pageSize: 30,
    });
  });

  it('refuses an unknown sort, stage or unread word and a page over 100', () => {
    const bad = [{ sort: 'phone' }, { status: 'gone' }, { unread: 'yes' }, { pageSize: 101 }];
    expect(bad.map((q) => routes.list.query.safeParse(q).success)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('answers a page of chat views with its total', () => {
    const page = { items: [VIEW], total: 1, page: 1, pageSize: 25 };
    expect(routes.list.response.parse(page)).toEqual(page);
    expect(routes.list.response.safeParse({ items: [VIEW] }).success).toBe(false);
  });
});
