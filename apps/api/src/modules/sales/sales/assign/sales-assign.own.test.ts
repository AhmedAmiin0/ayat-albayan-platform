import { describe, expect, it } from 'vitest';
import { fakeOwnNumbers, OWN_NOT_IN } from '../../../messaging/numbers/own/own-numbers.fakes';
import { fakeDb } from '../../../people/guardians/fake-db';
import { SalesAssignQueries } from './sales-assign.queries';

describe('SalesAssignQueries — the academy’s own numbers', () => {
  it('their old lead is never among the unassigned leads to hand out', async () => {
    const { db, argsOf } = fakeDb({ leads: [{ data: [{ id: 'l1' }] }] });
    expect(await new SalesAssignQueries(db, fakeOwnNumbers()).unassignedLeadIds()).toEqual(['l1']);
    expect(argsOf('leads', 'not')).toEqual(['phone_e164', 'in', OWN_NOT_IN]);
  });
});
