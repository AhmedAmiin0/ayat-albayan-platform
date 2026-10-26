import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { LeadsQueries, type LeadListFilter } from './leads.queries';

const page = { page: 1, pageSize: 25 };
const A = '11111111-1111-4111-8111-111111111111';

async function list(f: LeadListFilter) {
  const fake = fakeDb({ leads: [{ data: [], count: 0 }] });
  await new LeadsQueries(fake.db).list(f);
  return (method: string) => fake.calls.filter((c) => c.method === method).map((c) => c.args);
}

describe('GET /leads sort + assignee filter (R-LEAD-01, R-LEAD-05, R-NFR-08)', () => {
  it('default: latest inbound first (nulls last), then newest', async () => {
    const of = await list(page);
    expect(of('order')).toEqual([
      ['last_inbound_at', { ascending: false, nullsFirst: false }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('a requested key → its column, newest first as the tiebreaker', async () => {
    const of = await list({ ...page, sort: 'name' });
    expect(of('order')).toEqual([
      ['name', { ascending: true, nullsFirst: false }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('oldest first: created_at ascending alone', async () => {
    const of = await list({ ...page, sort: 'created_at' });
    expect(of('order')).toEqual([['created_at', { ascending: true }]]);
  });

  it('assignee: a person → eq, none → is null', async () => {
    expect((await list({ ...page, assignee: A }))('eq')).toEqual([['assigned_to', A]]);
    expect((await list({ ...page, assignee: 'none' }))('is')).toEqual([['assigned_to', null]]);
  });
});
