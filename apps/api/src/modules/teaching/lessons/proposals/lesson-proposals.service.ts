import {
  isOpenLesson,
  type LessonProposalRequest,
  type ProposalApprove,
  type ProposalRequester,
} from '@ab/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict, forbidden } from '@/common/http/errors';
import { LessonAccess } from '@/modules/teaching/lessons/store/lesson-access';
import { LessonProposalRepo, type ProposalRow } from './lesson-proposals.repo';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { RescheduleOneService } from '@/modules/teaching/lessons/reschedule/reschedule-one.service';
import { invalidTransition } from '@/modules/teaching/lessons/status/transition';
import { RequestDeclinePush } from './request-decline.push';

type ProposeInput = { lessonId: string; body: LessonProposalRequest; actor: AuthUser };
type DecideInput = { proposalId: string; actor: AuthUser };
type ApproveInput = DecideInput & { body: ProposalApprove };
/** `note`: the answer's note, the family reads it with the decline (owner 2026-11-17). */
type RejectInput = DecideInput & { note?: string };

/** An assistant (base role sales) never books over a clash. */
const overrideRefused = (actor: AuthUser): boolean => actor.role === 'sales';

/** A teacher's proposed new time for their own open lesson (R-SCH-08); returns the lesson id. */
@Injectable()
export class LessonProposeService {
  constructor(
    private readonly proposals: LessonProposalRepo,
    private readonly store: LessonStore,
    private readonly access: LessonAccess,
  ) {}

  /** 403 not theirs, 409 closed lesson / proposal_pending, 400 date_in_past. */
  async propose({ lessonId, body, actor }: ProposeInput): Promise<string> {
    const lesson = await this.store.get(lessonId);
    await this.access.assertCanTouch(actor, lesson);
    if (!isOpenLesson(lesson.status)) throw invalidTransition(lesson.status, 'reschedule');
    if (Date.parse(body.startsAt) <= Date.now()) throw badRequest('date_in_past');
    await this.proposals.create({
      lesson_id: lesson.id,
      teacher_id: lesson.teacher_id,
      proposed_starts_at: new Date(body.startsAt).toISOString(),
      note: body.note || null,
      created_by: actor.id,
    });
    return lesson.id;
  }
}

/** Approving is a reschedule in one transaction (409 conflict unless override.reason). */
@Injectable()
export class ProposalDecisionService {
  constructor(
    private readonly proposals: LessonProposalRepo,
    private readonly reschedule: RescheduleOneService,
    @Inject(RequestDeclinePush) private readonly declined: RequestDeclinePush,
  ) {}

  /** Lessons with a proposal waiting for an answer, oldest first. */
  pendingLessonIds(by?: ProposalRequester): Promise<string[]> {
    return this.proposals.pendingLessonIds(by);
  }

  /**
   * Returns the new lesson's id. The proposal is claimed first (pending → approved, 409
   * proposal_decided when it was answered or withdrawn meanwhile), then the lesson moves; a failed
   * move (409 conflict, …) hands the claim back. 403 override_not_allowed: an assistant never
   * books over a clash (as sales-booking.scope.ts).
   */
  async approve({ proposalId, body, actor }: ApproveInput): Promise<string> {
    if (body.override && overrideRefused(actor)) throw forbidden('override_not_allowed');
    const proposal = await this.pending(proposalId);
    const claimed = await this.proposals.decide(proposalId, { status: 'approved', decided_by: actor.id });
    if (!claimed) throw conflict('proposal_decided');
    const newId = await this.move(proposal, { body, actor }).catch(async (e: unknown) => {
      await this.proposals.release(proposalId);
      throw e;
    });
    await this.proposals.link(proposalId, newId);
    return newId;
  }

  private move(proposal: ProposalRow, { body, actor }: Omit<ApproveInput, 'proposalId'>) {
    return this.reschedule.reschedule({
      lessonId: proposal.lesson_id,
      body: {
        scope: 'one',
        startsAt: body.startsAt ?? proposal.proposed_starts_at,
        override: body.override,
        // docs/47: her proposal's note is the move reason the student file shows.
        ...(proposal.note ? { reason: proposal.note } : {}),
      },
      actor,
    });
  }

  /** Returns the (unchanged) lesson's id. */
  async reject({ proposalId, actor, note }: RejectInput): Promise<string> {
    const proposal = await this.pending(proposalId);
    const answer = { status: 'rejected' as const, decided_by: actor.id };
    const decided = await this.proposals.decide(proposalId, {
      ...answer,
      ...(note ? { decision_note: note } : {}),
    });
    if (!decided) throw conflict('proposal_decided');
    await this.declined.notify({ ...proposal, decision_note: note ?? null });
    return proposal.lesson_id;
  }

  private async pending(id: string) {
    const proposal = await this.proposals.get(id);
    if (!proposal) throw new NotFoundException();
    if (proposal.status !== 'pending') throw conflict('proposal_decided');
    return proposal;
  }
}
