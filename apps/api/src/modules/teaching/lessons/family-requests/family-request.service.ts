import { isOpenLesson, type PortalRequest } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict } from '@/common/http/errors';
import { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';

interface RequestInput {
  lessonId: string;
  body: PortalRequest;
  actor: AuthUser;
}

/** Still open and not started: the family may still ask, withdraw, confirm or excuse. */
export const isAheadOpen = (l: Pick<LessonRow, 'status' | 'starts_at'>, now: Date): boolean =>
  isOpenLesson(l.status) && Date.parse(l.starts_at) > now.getTime();

/**
 * The family's «اطلب موعدًا آخر» (owner 2026-11-17): a lesson_proposals row requested_by 'family',
 * answered by staff like a teacher's proposal (ProposalDecisionService); the lesson keeps its time
 * until then. «سحب الطلب» withdraws it. The caller (the portal) already decided the lesson is the
 * login's own student's.
 */
@Injectable()
export class FamilyRequestService {
  constructor(
    private readonly proposals: LessonProposalRepo,
    private readonly store: LessonStore,
  ) {}

  /** 409 lesson_started / proposal_pending, 400 date_in_past. */
  async request({ lessonId, body, actor }: RequestInput): Promise<void> {
    const lesson = await this.store.get(lessonId);
    const now = new Date();
    if (!isAheadOpen(lesson, now)) throw conflict('lesson_started');
    if (Date.parse(body.startsAt) <= now.getTime()) throw badRequest('date_in_past');
    await this.proposals.create({
      lesson_id: lesson.id,
      teacher_id: lesson.teacher_id,
      proposed_starts_at: new Date(body.startsAt).toISOString(),
      note: body.note || null,
      created_by: actor.id,
      requested_by: 'family',
    });
  }

  /** 409 no_request when nothing of theirs waits (already answered, or never asked). */
  async withdraw(lessonId: string): Promise<void> {
    if (!(await this.proposals.withdraw(lessonId))) throw conflict('no_request');
  }
}
