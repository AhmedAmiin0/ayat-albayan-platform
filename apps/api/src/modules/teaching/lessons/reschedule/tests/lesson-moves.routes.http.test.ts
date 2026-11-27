import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RULE_ID } from '@/modules/teaching/scheduling/scheduling.fakes';
import { LESSON_ID, lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import { lessonsApp } from '@/modules/teaching/lessons/test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const ONE = { scope: 'one', startsAt: '2026-10-05T17:00:00+03:00' };
const TIME = { expectedStartsAt: '2026-10-04T14:00:00Z', startsAt: '2026-10-05T14:00:00Z', durationMin: 45 };
const CANCEL = { by: 'admin', reason: 'انسحب', from: '2026-10-05' };

describe('lesson move route objects (R-SCH-07, R-SCH-11)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: new Date('2026-10-02T10:00:00Z'), toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    ['POST', '/lessons/l1/reschedule', ONE],
    ['PATCH', '/lessons/l1/time', TIME],
    ['POST', '/schedule-rules/r1/cancel', CANCEL],
  ] as const)('%s %s answers 400 validation_failed and writes nothing', async (method, url, body) => {
    const res = await h.call({ method, url, body });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(h.writer.apply).not.toHaveBeenCalled();
    expect(h.writer.retime).not.toHaveBeenCalled();
  });

  it('a moved lesson whose id is not a uuid answers 500 response_invalid', async () => {
    h.lessons.get.mockResolvedValue(lessonRow({ id: 'l1' }));
    const url = `/lessons/${LESSON_ID}/time`;
    const res = await h.call({ method: 'PATCH', url, body: TIME });
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });

  it('a rule cancel whose cancelled lesson is not a uuid answers 500 response_invalid', async () => {
    const open = { id: 'l1', status: 'scheduled', starts_at: '2026-10-06T14:00:00Z' };
    h.lessons.openOfRule.mockResolvedValue([open]);
    h.lessons.byIds.mockResolvedValue([lessonRow({ id: 'l1' })]);
    const res = await h.call({ method: 'POST', url: `/schedule-rules/${RULE_ID}/cancel`, body: CANCEL });
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });
});
