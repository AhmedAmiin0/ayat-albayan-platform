import { describe, expect, it } from 'vitest';
import { aMessageView } from '../../../../testing';
import { threadReadRoutes as routes } from '..';

const PHONE = '+966500000001';
const PAGE = {
  thread: null,
  messages: [aMessageView()],
  has_more: false,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
};
const DELTA = { messages: [aMessageView()], has_more: false, pending: [] };

describe('threadReadRoutes.detail', () => {
  it('names the chat by its E.164 phone', () => {
    expect(routes.detail.params.parse({ phone: PHONE })).toEqual({ phone: PHONE });
    expect(routes.detail.params.safeParse({ phone: 'not-a-phone' }).success).toBe(false);
  });

  it('answers a page or a delta, each with its own fields kept', () => {
    expect(routes.detail.response.parse(PAGE)).toEqual(PAGE);
    expect(routes.detail.response.parse(DELTA)).toEqual(DELTA);
  });

  it('refuses an answer that is neither a page nor a delta', () => {
    const { pending: _pending, ...noPending } = DELTA;
    expect(routes.detail.response.safeParse(noPending).success).toBe(false);
  });

  it('tells a delta from a page by after alone', () => {
    const at = '2026-10-27T10:00:00.000Z';
    expect(routes.detail.query.parse({ after: at }).mode).toBe('delta');
    expect(routes.detail.query.parse({ before: at }).mode).toBe('page');
  });
});
