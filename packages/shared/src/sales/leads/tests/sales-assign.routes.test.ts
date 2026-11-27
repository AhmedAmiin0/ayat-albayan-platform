import { describe, expect, it } from 'vitest';
import { salesAssignRoutes as routes } from '../sales-assign.routes';

const ID = '11111111-1111-4111-8111-111111111111';

describe('salesAssignRoutes', () => {
  it('keeps the paths, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['GET', '/sales/people', ['leads.assign'], ['sales']],
      ['POST', '/leads/assign-unassigned', ['leads.assign'], ['sales']],
      ['POST', '/leads/:id/assign', ['leads.assign'], ['sales']],
    ]);
  });

  it('answers the salespeople with their open-lead counts', () => {
    const person = { id: ID, name: 'سارة', open_leads: 3 };
    expect(routes.people.response.parse([person])).toEqual([person]);
    expect(routes.people.response.safeParse([{ ...person, open_leads: -1 }]).success).toBe(false);
    expect(routes.people.response.safeParse([{ ...person, phone: '+966500000000' }]).success).toBe(
      false,
    );
  });

  it('answers how many ownerless leads were handed out', () => {
    expect(routes.assignUnassigned.response.parse({ assigned: 2 })).toEqual({ assigned: 2 });
    expect(routes.assignUnassigned.response.safeParse({ assigned: 1.5 }).success).toBe(false);
  });

  it('takes a salesperson or null for a uuid lead, and refuses anything else', () => {
    expect(routes.assign.params.safeParse({ id: 'abc' }).success).toBe(false);
    expect(routes.assign.body.parse({ profileId: null })).toEqual({ profileId: null });
    expect(routes.assign.body.parse({ profileId: ID })).toEqual({ profileId: ID });
    expect(routes.assign.body.safeParse({ profileId: 'someone' }).success).toBe(false);
  });
});
