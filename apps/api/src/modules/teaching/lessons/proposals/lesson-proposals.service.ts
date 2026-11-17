import {
  isOpenLesson,
  type LessonProposalRequest,
  type ProposalApprove,
  type ProposalRequester,
} from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict } from '@/common/http/errors';
import { LessonAccess } from '@/modules/teaching/lessons/store/lesson-access';
import { LessonProposalRepo } from './lesson-proposals.repo';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { RescheduleOneService } from '@/modules/teaching/lessons/reschedule/reschedule-one.service';
import { invalidTransition } from '@/modules/teaching/lessons/status/transition';
import { RequestDeclinePush } from './request-decline.push';

type ProposeInput = { lessonId: string; body: LessonProposalRequest; actor: AuthUser };
type DecideInput = { proposalId: string; actor: AuthUser };
type ApproveInput = DecideInput & { body: ProposalApprove };
/** `note`: the answer's note, the family reads it with the decline (owner 2026-11-17). */
type RejectInput = DecideInput & { note?: string };

/** A teacher's «اقترح ميعاد تاني» for their own open lesson (R-SCH-08). Returns the lesson id. */
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

/**
 * Staff's answer to a teacher's proposal or a family's request (R-SCH-08). Approving IS a
 * reschedule of that one lesson — conflict check (409 conflict unless override.reason), the move
 * and the family notice in one transaction — then the proposal is marked; `startsAt` moves it to
 * another free time instead («اختر موعدًا آخر»). Rejecting marks it, with the answer's note; a
 * family's request then hears it (RequestDeclinePush).
 */
@Injectable()
export class ProposalDecisionService {
  constructor(
    private readonly proposals: LessonProposalRepo,
    private readonly reschedule: RescheduleOneService,
    private readonly declined: RequestDeclinePush,
  ) {}

  /** Lessons with a proposal waiting for an answer, oldest first. */
  pendingLessonIds(by?: ProposalRequester): Promise<string[]> {
    return this.proposals.pendingLessonIds(by);
  }

  /** Returns the new lesson's id. */
  async approve({ proposalId, body, actor }: ApproveInput): Promise<string> {
    const proposal = await this.pending(proposalId);
    const newId = await this.reschedule.reschedule({
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
    // The lesson is moved either way; a lost race here only leaves the proposal unmarked.
    await this.proposals.decide(proposalId, { status: 'approved', decided_by: actor.id, new_lesson_id: newId });
    return newId;
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
