import { describe, expect, it } from 'vitest';
import { fakeOwnNumbers, OWN_NOT_IN } from '../../messaging/numbers/own/own-numbers.fakes';
import { fakeDb } from '../../people/guardians/fake-db';
import { DashboardQueries } from './dashboard.queries';

const W = { from: new Date('2026-10-20T21:00:00.000Z'), to: new Date('2026-10-27T21:00:00.000Z') };

describe('DashboardQueries.leads — the academy’s own numbers', () => {
  it('their lead is not counted', async () => {
    const { db, argsOf } = fakeDb({ leads: [{ data: [] }] });
    await new DashboardQueries(db, fakeOwnNumbers()).leads(W);
    expect(argsOf('leads', 'not')).toEqual(['phone_e164', 'in', OWN_NOT_IN]);
  });
});
