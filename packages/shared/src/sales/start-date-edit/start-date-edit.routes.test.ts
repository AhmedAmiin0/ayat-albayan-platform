import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { startDateEditRoutes } from './start-date-edit.routes';

const SUB = 'e5555555-5555-4555-8555-555555555555';

describe('startDateEditRoutes', () => {
  it('keeps the path the api serves today', () => {
    const { edit } = startDateEditRoutes;
    expect(`${edit.method} ${edit.path}`).toBe('PATCH /subscriptions/:id/start-date');
    expect(routePath(edit, { id: SUB })).toBe(`/subscriptions/${SUB}/start-date`);
  });

  it('takes one day and nothing else', () => {
    const { body } = startDateEditRoutes.edit;
    expect(body.parse({ startsOn: '2026-11-01' })).toEqual({ startsOn: '2026-11-01' });
    expect(body.safeParse({ startsOn: '2026-11-01', notes: 'x' }).success).toBe(false);
  });

  it('rejects an id that is not a uuid', () => {
    expect(startDateEditRoutes.edit.params.safeParse({ id: 'nope' }).success).toBe(false);
  });
});
