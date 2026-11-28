import { isFamilyActionable, type PortalRequest } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict } from '@/common/http/errors';
import { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';

interface RequestInput {
  lessonId: string;
  body: PortalRequest;
  actor: AuthUser;
}

/** A family's reschedule request is answered like a teacher's proposal; time kept until then. */
@Injectable()
export class FamilyRequestService {
  constructor(
    @Inject(LessonProposalRepo) private readonly proposals: LessonProposalRepo,
    @Inject(LessonStore) private readonly store: LessonStore,
  ) {}

  /** 409 lesson_started / proposal_pending, 400 date_in_past. */
  async request({ lessonId, body, actor }: RequestInput): Promise<void> {
    const lesson = await this.store.get(lessonId);
    const now = new Date();
    if (!isFamilyActionable(lesson, now)) throw conflict('lesson_started');
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

  /**
   * 409 no_request when nothing of this login's waits (already answered, never asked, or another
   * login's request: only its asker withdraws it).
   */
  async withdraw(lessonId: string, actor: AuthUser): Promise<void> {
    const withdrawn = await this.proposals.withdraw({ lessonId, userId: actor.id });
    if (!withdrawn) throw conflict('no_request');
  }
}
