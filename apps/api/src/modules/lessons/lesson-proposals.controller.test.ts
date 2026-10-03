import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON_ID, lessonRow, OTHER_TEACHER_ID } from './lessons.fakes';
import { lessonsApp } from './test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const PROPOSAL_ID = '00000000-0000-4000-8000-0000000000f1';
const LATER = '2026-10-05T15:00:00.000Z';
const pendingRow = lessonRow({
  proposals: [{ id: PROPOSAL_ID, proposed_starts_at: LATER, note: null, status: 'pending', created_at: '2026-10-02T09:00:00Z' }],
});

describe('Teacher proposals «اقترح موعدًا آخر» — routes and roles (R-SCH-08, rule 9)', () => {
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

  it('a teacher proposes for their own lesson → 201 with the pending proposal', async () => {
    h.lessons.get.mockResolvedValueOnce(lessonRow()).mockResolvedValue(pendingRow);
    const res = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/propose`, token: 'teacher', body: { startsAt: LATER } });
    expect(res.statusCode).toBe(201);
    expect(res.json().pending_proposal).toMatchObject({ id: PROPOSAL_ID, proposed_starts_at: LATER });
    expect(h.proposals.create).toHaveBeenCalledWith(expect.objectContaining({ lesson_id: LESSON_ID, proposed_starts_at: LATER }));
  });

  it("another teacher's lesson → 403; an admin moves lessons directly (403 here); bad body → 400", async () => {
    h.lessons.get.mockResolvedValue(lessonRow({ teacher_id: OTHER_TEACHER_ID }));
    const post = (token: 'teacher' | 'admin', body: object) =>
      h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/propose`, token, body });
    expect((await post('teacher', { startsAt: LATER })).statusCode).toBe(403);
    expect((await post('admin', { startsAt: LATER })).statusCode).toBe(403);
    expect((await post('teacher', { startsAt: '2026-10-05 15:00' })).statusCode).toBe(400);
    expect(h.proposals.create).not.toHaveBeenCalled();
  });

  it('the admin lists, approves (a reschedule) and rejects; teachers cannot', async () => {
    h.proposals.pendingLessonIds.mockResolvedValue([LESSON_ID]);
    h.lessons.byIds.mockResolvedValue([pendingRow]);
    const list = await h.call({ method: 'GET', url: '/lesson-proposals' });
    expect(list.json().map((l: { pending_proposal: { id: string } }) => l.pending_proposal.id)).toEqual([PROPOSAL_ID]);
    expect((await h.call({ method: 'GET', url: '/lesson-proposals', token: 'teacher' })).statusCode).toBe(403);

    h.proposals.get.mockResolvedValue({ id: PROPOSAL_ID, lesson_id: LESSON_ID, proposed_starts_at: LATER, status: 'pending' });
    const approved = await h.call({ method: 'POST', url: `/lesson-proposals/${PROPOSAL_ID}/approve`, body: {} });
    expect(approved.statusCode).toBe(200);
    expect(h.writer.apply).toHaveBeenCalledTimes(1);
    expect(h.proposals.decide).toHaveBeenCalledWith(PROPOSAL_ID, expect.objectContaining({ status: 'approved' }));

    const rejected = await h.call({ method: 'POST', url: `/lesson-proposals/${PROPOSAL_ID}/reject` });
    expect(rejected.statusCode).toBe(200);
    const asTeacher = await h.call({ method: 'POST', url: `/lesson-proposals/${PROPOSAL_ID}/reject`, token: 'teacher' });
    expect(asTeacher.statusCode).toBe(403);
  });
});
