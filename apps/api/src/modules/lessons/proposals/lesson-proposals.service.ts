import { isOpenLesson, type LessonProposalRequest, type ProposalApprove } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { badRequest, conflict } from '../../../common/http/errors';
import { LessonAccess } from '../store/lesson-access';
import { LessonProposalQueries } from './lesson-proposals.queries';
import { LessonStore } from '../store/lesson-store';
import { RescheduleOneService } from '../reschedule/reschedule-one.service';
import { invalidTransition } from '../status/transition';

export type ProposeInput = { lessonId: string; body: LessonProposalRequest; actor: AuthUser };
export type DecideInput = { proposalId: string; actor: AuthUser };
export type ApproveInput = DecideInput & { body: ProposalApprove };

/** A teacher's «اقترح ميعاد تاني» for their own open lesson (R-SCH-08). Returns the lesson id. */
@Injectable()
export class LessonProposeService {
  constructor(
    private readonly proposals: LessonProposalQueries,
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

/**
 * The admin's answer (R-SCH-08). Approving IS a reschedule of that one lesson — conflict check
 * (409 conflict unless override.reason), the move and the guardian's confirmation in one
 * transaction — then the proposal is marked. Rejecting only marks it.
 */
@Injectable()
export class ProposalDecisionService {
  constructor(
    private readonly proposals: LessonProposalQueries,
    private readonly reschedule: RescheduleOneService,
  ) {}

  /** Lessons with a proposal waiting for an answer, oldest first. */
  pendingLessonIds(): Promise<string[]> {
    return this.proposals.pendingLessonIds();
  }

  /** Returns the new lesson's id. */
  async approve({ proposalId, body, actor }: ApproveInput): Promise<string> {
    const proposal = await this.pending(proposalId);
    const newId = await this.reschedule.reschedule({
      lessonId: proposal.lesson_id,
      body: { scope: 'one', startsAt: proposal.proposed_starts_at, override: body.override },
      actor,
    });
    // The lesson is moved either way; a lost race here only leaves the proposal unmarked.
    await this.proposals.decide(proposalId, { status: 'approved', decided_by: actor.id, new_lesson_id: newId });
    return newId;
  }

  /** Returns the (unchanged) lesson's id. */
  async reject({ proposalId, actor }: DecideInput): Promise<string> {
    const proposal = await this.pending(proposalId);
    if (!(await this.proposals.decide(proposalId, { status: 'rejected', decided_by: actor.id }))) {
      throw conflict('proposal_decided');
    }
    return proposal.lesson_id;
  }

  private async pending(id: string) {
    const proposal = await this.proposals.get(id);
    if (!proposal) throw new NotFoundException();
    if (proposal.status !== 'pending') throw conflict('proposal_decided');
    return proposal;
  }
}
