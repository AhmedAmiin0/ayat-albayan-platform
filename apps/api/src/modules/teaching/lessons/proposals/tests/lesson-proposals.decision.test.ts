import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '@/common/http/errors';
import { ADMIN, LESSON_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { decider, PROPOSAL, proposals, rescheduler } from './proposals.fakes';

describe('ProposalDecisionService — the admin approves or rejects (R-SCH-08)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    proposals.get.mockResolvedValue(PROPOSAL);
    proposals.decide.mockResolvedValue(true);
    rescheduler.reschedule.mockResolvedValue('new-lesson');
  });

  it('approve = claim it, reschedule that lesson to the proposed time, then link the new one', async () => {
    const override = { reason: 'ولي الأمر موافق' };
    expect(await decider.approve({ proposalId: 'p1', body: { override }, actor: ADMIN })).toBe(
      'new-lesson',
    );
    expect(rescheduler.reschedule).toHaveBeenCalledWith({
      lessonId: LESSON_ID,
      body: { scope: 'one', startsAt: PROPOSAL.proposed_starts_at, override },
      actor: ADMIN,
    });
    expect(proposals.decide).toHaveBeenCalledWith('p1', {
      status: 'approved',
      decided_by: ADMIN.id,
    });
    expect(proposals.link).toHaveBeenCalledWith('p1', 'new-lesson');
  });

  it('approve forwards her note as the move reason (docs/47)', async () => {
    proposals.get.mockResolvedValue({ ...PROPOSAL, note: 'سفر' });
    await decider.approve({ proposalId: 'p1', body: {}, actor: ADMIN });
    const startsAt = PROPOSAL.proposed_starts_at;
    const body = { scope: 'one', startsAt, override: undefined, reason: 'سفر' };
    const call = { lessonId: LESSON_ID, body, actor: ADMIN };
    expect(rescheduler.reschedule).toHaveBeenCalledWith(call);
  });

  it('a clash surfaces as 409 conflict and the claim is handed back (pending again)', async () => {
    rescheduler.reschedule.mockRejectedValue(conflict('conflict', { conflicts: [] }));
    await expect(
      decider.approve({ proposalId: 'p1', body: {}, actor: ADMIN }),
    ).rejects.toMatchObject({ response: { code: 'conflict' } });
    expect(proposals.release).toHaveBeenCalledWith('p1');
    expect(proposals.link).not.toHaveBeenCalled();
  });

  it('withdrawn or answered meanwhile (the claim lost) → 409 proposal_decided, nothing moves', async () => {
    proposals.decide.mockResolvedValueOnce(false);
    await expect(
      decider.approve({ proposalId: 'p1', body: {}, actor: ADMIN }),
    ).rejects.toMatchObject({
      response: { code: 'proposal_decided' },
    });
    expect(rescheduler.reschedule).not.toHaveBeenCalled();
  });

  it('an assistant never sends override → 403 override_not_allowed; without it she approves', async () => {
    const SALES = { id: 'sa-1', email: null, role: 'sales' as const };
    await expect(
      decider.approve({ proposalId: 'p1', body: { override: { reason: 'سبب' } }, actor: SALES }),
    ).rejects.toMatchObject({ response: { code: 'override_not_allowed' } });
    expect(proposals.decide).not.toHaveBeenCalled();
    expect(await decider.approve({ proposalId: 'p1', body: {}, actor: SALES })).toBe('new-lesson');
  });

  it('reject marks it; an answered proposal → 409 proposal_decided; unknown → 404', async () => {
    expect(await decider.reject({ proposalId: 'p1', actor: ADMIN })).toBe(LESSON_ID);
    expect(proposals.decide).toHaveBeenCalledWith('p1', {
      status: 'rejected',
      decided_by: ADMIN.id,
    });
    proposals.get.mockResolvedValueOnce({ ...PROPOSAL, status: 'approved' });
    await expect(decider.reject({ proposalId: 'p1', actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'proposal_decided' },
    });
    proposals.decide.mockResolvedValueOnce(false);
    await expect(decider.reject({ proposalId: 'p1', actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'proposal_decided' },
    });
    proposals.get.mockResolvedValueOnce(null);
    await expect(
      decider.approve({ proposalId: 'p1', body: {}, actor: ADMIN }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
