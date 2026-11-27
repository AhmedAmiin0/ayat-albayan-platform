import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import { lessonsApp } from '@/modules/teaching/lessons/test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const STUDENT = '00000000-0000-4000-8000-0000000000aa';
const page = { total: 1, page: 1, pageSize: 25 };

describe('lesson action and student lesson route objects', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each(['confirm', 'status', 'cancel', 'correct'])(
    'POST /lessons/not-a-uuid/%s answers 400 validation_failed and writes nothing',
    async (action) => {
      const res = await h.call({ method: 'POST', url: `/lessons/l1/${action}`, body: {} });
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
      expect(h.writer.apply).not.toHaveBeenCalled();
    },
  );

  it('a correction with an extra field answers 400 validation_failed', async () => {
    const body = { to: 'completed', extra: true };
    const res = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/correct`, body });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
  });

  it('a student page past the size cap answers 400 validation_failed', async () => {
    const url = `/students/${STUDENT}/lessons?pageSize=500`;
    const res = await h.call({ method: 'GET', url });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(h.lessons.studentPage).not.toHaveBeenCalled();
  });

  it('a student page whose lesson id is not a uuid answers 500 response_invalid', async () => {
    h.lessons.studentExists.mockResolvedValue(true);
    h.lessons.studentPage.mockResolvedValue({ ...page, items: [lessonRow({ id: 'l1' })] });
    const res = await h.call({ method: 'GET', url: `/students/${STUDENT}/lessons` });
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });
});
