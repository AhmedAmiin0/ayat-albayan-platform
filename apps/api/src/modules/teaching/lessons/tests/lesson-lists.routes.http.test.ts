import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import { lessonsApp } from '@/modules/teaching/lessons/test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const WEEK = 'from=2026-10-04T00:00:00%2B03:00&to=2026-10-11T00:00:00%2B03:00';

describe('lesson list route objects', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each([`/lessons?${WEEK}&teacherId=x`, '/lessons/day?date=2026-10-04&tz=Mars/Base'])(
    'GET %s answers 400 validation_failed and reads nothing',
    async (url) => {
      const res = await h.call({ method: 'GET', url });
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
      expect(h.lessons.window).not.toHaveBeenCalled();
    },
  );

  it('a window that ends before it starts answers 400 validation_failed', async () => {
    const url = '/lessons?from=2026-10-11T00:00:00Z&to=2026-10-04T00:00:00Z';
    const res = await h.call({ method: 'GET', url });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
  });

  it('answers 500 response_invalid for a lesson whose id is not a uuid', async () => {
    h.lessons.window.mockResolvedValue([lessonRow({ id: 'l1' })]);
    const res = await h.call({ method: 'GET', url: `/lessons?${WEEK}` });
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });
});
