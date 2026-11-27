import { describe, expect, it } from 'vitest';
import { usedBeforeRoutes as routes } from '../used-before.routes';

const ID = 'b1111111-1111-4111-8111-111111111111';
const STATE = { subscription_id: ID, lessons_used_before: 2, max: 4, blocked: null };

describe('usedBeforeRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /subscriptions/:id/lessons-used-before',
      'PATCH /subscriptions/:id/lessons-used-before',
    ]);
  });

  it('names a package by a uuid', () => {
    expect(routes.state.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(routes.edit.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('answers the stored number, the stepper max and a refusal', () => {
    expect(routes.state.response.parse(STATE)).toEqual(STATE);
    const blocked = { ...STATE, blocked: 'not_a_block' };
    expect(routes.state.response.safeParse(blocked).success).toBe(false);
  });

  it('edits one bounded number and nothing else', () => {
    expect(routes.edit.body.parse({ lessonsUsedBefore: 3 })).toEqual({ lessonsUsedBefore: 3 });
    expect(routes.edit.body.safeParse({ lessonsUsedBefore: -1 }).success).toBe(false);
    expect(routes.edit.body.safeParse({ lessonsUsedBefore: 1, x: 1 }).success).toBe(false);
  });
});
