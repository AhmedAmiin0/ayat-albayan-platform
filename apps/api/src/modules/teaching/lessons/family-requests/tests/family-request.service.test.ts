import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAMILY_USER, fakeStore, LESSON_ID, lessonRow, TEACHER_ID } from '@/modules/teaching/lessons/lessons.fakes';
import type { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import { FamilyRequestService } from '@/modules/teaching/lessons/family-requests/family-request.service';

const proposals = { create: vi.fn(), withdraw: vi.fn() };
const NOW = new Date('2026-10-02T10:00:00Z');
const LATER = '2026-10-05T15:00:00.000Z';
const service = (row = lessonRow()) =>
  new FamilyRequestService(proposals as unknown as LessonProposalRepo, fakeStore(row).store);

describe('FamilyRequestService: «اطلب موعدًا آخر» and «سحب الطلب» (owner 2026-11-17)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW });
  });
  afterEach(() => vi.useRealTimers());

  it("stores a pending family row on the lesson's teacher, by the login that asked", async () => {
    await service().request({ lessonId: LESSON_ID, body: { startsAt: LATER, note: 'اختبار' }, actor: FAMILY_USER });
    expect(proposals.create).toHaveBeenCalledWith({
      lesson_id: LESSON_ID,
      teacher_id: TEACHER_ID,
      proposed_starts_at: LATER,
      note: 'اختبار',
      created_by: FAMILY_USER.id,
      requested_by: 'family',
    });
  });

  it('a started or closed lesson → 409 lesson_started; a past time → 400; nothing stored', async () => {
    const started = lessonRow({ starts_at: '2026-10-02T09:00:00Z' });
    const body = { startsAt: LATER };
    const call = { lessonId: LESSON_ID, body, actor: FAMILY_USER };
    await expect(service(started).request(call)).rejects.toMatchObject({
      response: { code: 'lesson_started' },
    });
    await expect(
      service(lessonRow({ status: 'excused' })).request({ lessonId: LESSON_ID, body, actor: FAMILY_USER }),
    ).rejects.toMatchObject({ response: { code: 'lesson_started' } });
    await expect(
      service().request({ lessonId: LESSON_ID, body: { startsAt: '2026-10-01T10:00:00Z' }, actor: FAMILY_USER }),
    ).rejects.toMatchObject({ response: { code: 'date_in_past' } });
    expect(proposals.create).not.toHaveBeenCalled();
  });

  it("withdraw marks the asker's own pending row; nothing of theirs → 409 no_request", async () => {
    proposals.withdraw.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await service().withdraw(LESSON_ID, FAMILY_USER);
    const mine = { lessonId: LESSON_ID, userId: FAMILY_USER.id };
    expect(proposals.withdraw).toHaveBeenCalledWith(mine);
    await expect(service().withdraw(LESSON_ID, FAMILY_USER)).rejects.toMatchObject({
      response: { code: 'no_request' },
    });
  });
});
