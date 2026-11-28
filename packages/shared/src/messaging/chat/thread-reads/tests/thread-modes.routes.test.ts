import { describe, expect, it } from 'vitest';
import { aMessageView } from '../../../../testing';
import { threadModeRoutes as modes, threadReadRoutes as reads } from '..';

const AT = '2026-10-27T10:00:00.000Z';
const ID = 'c0000000-0000-4000-8000-000000000001';
const PAGE = {
  thread: null,
  messages: [aMessageView()],
  has_more: false,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
};
const DELTA = { messages: [aMessageView()], has_more: false, pending: [] };

describe('threadModeRoutes', () => {
  it('reads the same wire as the served chat route, with its access', () => {
    for (const route of Object.values(modes)) {
      expect(`${route.method} ${route.path}`).toBe(`${reads.detail.method} ${reads.detail.path}`);
      expect(route.permissions).toEqual(reads.detail.permissions);
      expect(route.tags).toEqual(reads.detail.tags);
      expect(route.params).toBe(reads.detail.params);
    }
  });

  it('asks a page by its keyset or window and never with after', () => {
    expect(modes.page.query.parse({ before: AT, before_id: ID }).mode).toBe('page');
    expect(modes.page.query.parse({ around: ID }).mode).toBe('page');
    expect(modes.page.query.safeParse({ after: AT }).success).toBe(false);
  });

  it('answers a page only', () => {
    expect(modes.page.response.parse(PAGE)).toEqual(PAGE);
    expect(modes.page.response.safeParse(DELTA).success).toBe(false);
  });

  it('asks a delta by after with its pending ids, and refuses one without after', () => {
    expect(modes.delta.query.parse({ after: AT, pending: ID })).toMatchObject({
      mode: 'delta',
      pending: [ID],
    });
    expect(modes.delta.query.safeParse({ before: AT }).success).toBe(false);
  });

  it('answers a delta only', () => {
    expect(modes.delta.response.parse(DELTA)).toEqual(DELTA);
    expect(modes.delta.response.safeParse(PAGE).success).toBe(false);
  });
});
