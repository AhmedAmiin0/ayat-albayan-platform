import { describe, expect, it } from 'vitest';
import { fakeOwnNumbers, OWN_NOT_IN } from '../../messaging/numbers/own/own-numbers.fakes';
import { fakeDb } from '../../people/guardians/fake-db';
import { LeadsQueries } from './leads.queries';

// The lead made for one of the academy's own numbers before 2026-10-27: kept, never listed or counted.
const page = { page: 1, pageSize: 25 };

describe('LeadsQueries.list — the academy’s own numbers', () => {
  it('one not-in on phone_e164, so the page and its total (the nav count) both leave it out', async () => {
    const { db, argsOf } = fakeDb({ leads: [{ data: [], count: 0 }] });
    await new LeadsQueries(db, fakeOwnNumbers()).list({ ...page, status: 'new' });
    expect(argsOf('leads', 'not')).toEqual(['phone_e164', 'in', OWN_NOT_IN]);
  });

  it('none known: no filter', async () => {
    const { db, calls } = fakeDb({ leads: [{ data: [], count: 0 }] });
    await new LeadsQueries(db, fakeOwnNumbers([])).list(page);
    expect(calls.some((c) => c.method === 'not')).toBe(false);
  });
});
