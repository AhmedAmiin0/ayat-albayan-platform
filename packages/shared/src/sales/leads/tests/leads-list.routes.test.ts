import { describe, expect, it } from 'vitest';
import { leadListItem } from '../../../testing/leads';
import { leadReadRoutes as routes } from '../leads.routes';

const ITEM = leadListItem({ assigned_to_name: 'سارة', qualification: { age: 9 } });
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

describe('leadReadRoutes', () => {
  it('keeps the path, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([['GET', '/leads', ['leads.read'], ['leads']]]);
  });

  it('pages with 25 rows by default and keeps the filters, the sort and the search text', () => {
    expect(routes.list.query.parse({})).toEqual({ page: 1, pageSize: 25 });
    const query = { status: 'no_reply', source: 'facebook_ad', q: 'a,b)', page: '2' };
    expect(
      routes.list.query.parse({ ...query, sort: 'name', dir: 'asc', assignee: 'none' }),
    ).toEqual({ ...query, page: 2, pageSize: 25, sort: 'name', dir: 'asc', assignee: 'none' });
  });

  it('refuses an unknown status, source, sort key or an oversized page', () => {
    const bad = [{ status: 'gone' }, { source: 'tv' }, { sort: 'phone' }, { pageSize: '500' }];
    for (const query of bad) expect(routes.list.query.safeParse(query).success).toBe(false);
  });

  it('answers every lead column with the follower name', () => {
    expect(routes.list.response.parse(page([ITEM]))).toEqual(page([ITEM]));
    const nobody = leadListItem();
    expect(routes.list.response.parse(page([nobody])).items[0]?.assigned_to_name).toBeNull();
  });

  it('refuses a row with an unknown pauser or note, or a qualification that is not an object', () => {
    const bad = [
      { ...ITEM, follow_up_paused_by: 'bot' },
      { ...ITEM, follow_up_note: 'late' },
      { ...ITEM, qualification: [] },
    ];
    for (const row of bad) expect(routes.list.response.safeParse(page([row])).success).toBe(false);
  });

  it('answers a paused lead with who paused it and the follow-up note', () => {
    const row = { ...ITEM, follow_up_paused_by: 'lead', follow_up_note: 'no_slots' };
    const read = routes.list.response.parse(page([row])).items[0];
    expect([read?.follow_up_paused_by, read?.follow_up_note]).toEqual(['lead', 'no_slots']);
  });

  it('refuses a qualification stored as text or null', () => {
    for (const qualification of ['{}', null]) {
      const answer = routes.list.response.safeParse(page([{ ...ITEM, qualification }]));
      expect(answer.success).toBe(false);
    }
  });
});
