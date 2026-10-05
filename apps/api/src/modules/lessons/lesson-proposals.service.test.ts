import { ForbiddenException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '../scheduling/errors';
import type { LessonAccess } from './lesson-access';
import type { LessonProposalQueries } from './lesson-proposals.queries';
import { LessonProposeService, ProposalDecisionService } from './lesson-proposals.service';
import { ADMIN, fakeStore, LESSON_ID, lessonRow, TEACHER, TEACHER_ID } from './lessons.fakes';
import type { RescheduleOneService } from './reschedule-one.service';

const proposals = { create: vi.fn(), get: vi.fn(), decide: vi.fn(), pendingLessonIds: vi.fn() };
const access = { assertCanTouch: vi.fn() };
const rescheduler = { reschedule: vi.fn() };
const NOW = new Date('2026-10-02T10:00:00Z');
const LATER = '2026-10-05T15:00:00.000Z';
const PROPOSAL = { id: 'p1', lesson_id: LESSON_ID, proposed_starts_at: '2026-10-05 15:00:00+00', status: 'pending' };

const proposer = (row = lessonRow()) =>
  new LessonProposeService(
    proposals as unknown as LessonProposalQueries,
    fakeStore(row).store,
    access as unknown as LessonAccess,
  );
const decider = new ProposalDecisionService(
  proposals as unknown as LessonProposalQueries,
  rescheduler as unknown as RescheduleOneService,
);

describe('LessonProposeService — «اقترح موعدًا آخر» (R-SCH-08)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW });
  });
  afterEach(() => vi.useRealTimers());

  it("stores a pending proposal for the teacher's own open lesson", async () => {
    expect(await proposer().propose({ lessonId: LESSON_ID, body: { startsAt: LATER, note: 'سفر' }, actor: TEACHER })).toBe(LESSON_ID);
    expect(access.assertCanTouch).toHaveBeenCalledWith(TEACHER, expect.objectContaining({ teacher_id: TEACHER_ID }));
    expect(proposals.create).toHaveBeenCalledWith({
      lesson_id: LESSON_ID,
      teacher_id: TEACHER_ID,
      proposed_starts_at: LATER,
      note: 'سفر',
      created_by: TEACHER.id,
    });
  });

  it("another teacher's lesson → 403; a closed lesson → 409; a past time → 400; nothing stored", async () => {
    access.assertCanTouch.mockRejectedValueOnce(new ForbiddenException());
    await expect(proposer().propose({ lessonId: LESSON_ID, body: { startsAt: LATER }, actor: TEACHER })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      proposer(lessonRow({ status: 'completed' })).propose({ lessonId: LESSON_ID, body: { startsAt: LATER }, actor: TEACHER }),
    ).rejects.toMatchObject({ response: { code: 'invalid_transition' } });
    await expect(
      proposer().propose({ lessonId: LESSON_ID, body: { startsAt: '2026-10-01T10:00:00Z' }, actor: TEACHER }),
    ).rejects.toMatchObject({ response: { code: 'date_in_past' } });
    expect(proposals.create).not.toHaveBeenCalled();
  });
});

describe('ProposalDecisionService — the admin approves or rejects (R-SCH-08)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    proposals.get.mockResolvedValue(PROPOSAL);
    proposals.decide.mockResolvedValue(true);
    rescheduler.reschedule.mockResolvedValue('new-lesson');
  });

  it('approve = reschedule that lesson to the proposed time, then mark it approved', async () => {
    const override = { reason: 'ولي الأمر موافق' };
    expect(await decider.approve({ proposalId: 'p1', body: { override }, actor: ADMIN })).toBe('new-lesson');
    expect(rescheduler.reschedule).toHaveBeenCalledWith({
      lessonId: LESSON_ID,
      body: { scope: 'one', startsAt: PROPOSAL.proposed_starts_at, override },
      actor: ADMIN,
    });
    expect(proposals.decide).toHaveBeenCalledWith('p1', { status: 'approved', decided_by: ADMIN.id, new_lesson_id: 'new-lesson' });
  });

  it('a clash surfaces as 409 conflict and the proposal stays pending', async () => {
    rescheduler.reschedule.mockRejectedValue(conflict('conflict', { conflicts: [] }));
    await expect(decider.approve({ proposalId: 'p1', body: {}, actor: ADMIN })).rejects.toMatchObject({ response: { code: 'conflict' } });
    expect(proposals.decide).not.toHaveBeenCalled();
  });

  it('reject marks it; an answered proposal → 409 proposal_decided; unknown → 404', async () => {
    expect(await decider.reject({ proposalId: 'p1', actor: ADMIN })).toBe(LESSON_ID);
    expect(proposals.decide).toHaveBeenCalledWith('p1', { status: 'rejected', decided_by: ADMIN.id });
    proposals.get.mockResolvedValueOnce({ ...PROPOSAL, status: 'approved' });
    await expect(decider.reject({ proposalId: 'p1', actor: ADMIN })).rejects.toMatchObject({ response: { code: 'proposal_decided' } });
    proposals.decide.mockResolvedValueOnce(false);
    await expect(decider.reject({ proposalId: 'p1', actor: ADMIN })).rejects.toMatchObject({ response: { code: 'proposal_decided' } });
    proposals.get.mockResolvedValueOnce(null);
    await expect(decider.approve({ proposalId: 'p1', body: {}, actor: ADMIN })).rejects.toMatchObject({ status: 404 });
  });
});
