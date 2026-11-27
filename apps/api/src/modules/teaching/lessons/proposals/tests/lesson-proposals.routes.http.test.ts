import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import { lessonsApp } from '@/modules/teaching/lessons/test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const LATER = '2026-10-05T15:00:00.000Z';

describe('lesson proposal route objects (R-SCH-08)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each(['approve', 'reject'])(
    'POST /lesson-proposals/not-a-uuid/%s answers 400 validation_failed and decides nothing',
    async (action) => {
      const res = await h.call({ method: 'POST', url: `/lesson-proposals/p1/${action}` });
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
      expect(h.proposals.decide).not.toHaveBeenCalled();
    },
  );

  it('a proposal for a lesson id that is not a uuid answers 400 validation_failed', async () => {
    const body = { startsAt: LATER };
    const res = await h.call({ method: 'POST', url: '/lessons/l1/propose', token: 'teacher', body });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(h.proposals.create).not.toHaveBeenCalled();
  });

  it('a pending list whose lesson id is not a uuid answers 500 response_invalid', async () => {
    const row = lessonRow({
      id: 'l1',
      proposals: [
        { id: 'p1', proposed_starts_at: LATER, note: null, status: 'pending', created_at: LATER },
      ],
    });
    h.proposals.pendingLessonIds.mockResolvedValue([LESSON_ID]);
    h.lessons.byIds.mockResolvedValue([row]);
    const res = await h.call({ method: 'GET', url: '/lesson-proposals' });
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });
});
