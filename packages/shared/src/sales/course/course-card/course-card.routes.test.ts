import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { courseCardRoutes as routes } from './course-card.routes';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const LOOSE_HEX = '3f1c2a7e-9b4d-0e1a-0c2f-1d2e3f4a5b6c';

describe('courseCardRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /students/:id/course-card',
      'GET /sales/students/:id/course-card',
      'GET /students/:id/course-extend',
      'POST /students/:id/course-extend',
    ]);
    expect(routePath(routes.extend, { id: STUDENT })).toBe(`/students/${STUDENT}/course-extend`);
  });

  it('keeps the strict uuid check on the student id', () => {
    expect(routes.card.params.safeParse({ id: STUDENT }).success).toBe(true);
    expect(routes.card.params.safeParse({ id: LOOSE_HEX }).success).toBe(false);
  });

  it('previews the current package when no package is named', () => {
    expect(routes.extendPreview.query.parse({})).toEqual({});
    expect(routes.extendPreview.query.safeParse({ subscriptionId: 'x' }).success).toBe(false);
  });

  it('books one named package and nothing else', () => {
    const { body } = routes.extend;
    expect(body.parse({ subscriptionId: SUB })).toEqual({ subscriptionId: SUB });
    expect(body.safeParse({ subscriptionId: SUB, at: 'now' }).success).toBe(false);
  });

  it('answers the booked count and the new last day', () => {
    const booked = { subscriptionId: SUB, inserted: 2, endsOn: '2026-11-24', conflicts: 0 };
    expect(routes.extend.response.parse(booked)).toEqual(booked);
    expect(routes.extend.response.safeParse({ inserted: 2 }).success).toBe(false);
  });
});
