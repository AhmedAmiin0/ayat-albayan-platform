import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionAlertsService } from '../../finance/subscriptions';
import { CoursePauseLessonsBack } from './course-pause.lessons-back';
import type { RpcOut } from './course-pause.mapper';

/**
 * After a pause RPC commits (docs/11 §7b): the lessons back are booked and clash-checked (CoursePauseLessonsBack),
 * the balance alerts are told which lessons changed, and the student's packages and status are
 * recomputed (SubscriptionAlertsService: subscriptionStatusFor from the neutral 'unpaid' a resume wrote; a paused
 * package raises no alert). The pause itself never queues a message; after a resume the balance alerts work as
 * for any package (a renewal reminder when lessons run low and automatic messages are on, owner rules R-SUB-02).
 */
@Injectable()
export class CoursePauseFollowUps {
  constructor(
    private readonly back: CoursePauseLessonsBack,
    private readonly alerts: SubscriptionAlertsService,
    private readonly audit: AuditService,
  ) {}

  /** Returns how many clashes the lessons back have (0 for a start). */
  async after(out: RpcOut, actorId: string | null): Promise<number> {
    const clashes = await this.back.bookBack(out, actorId);
    await this.alerts.evaluateStudents([out.student_id], { actorId });
    return clashes;
  }

  /** Old package-only pauses lifted (CoursePauseService.resume): each audited, then the packages and student recomputed once. */
  async liftedLegacy(input: { studentId: string; subscriptionIds: readonly string[]; actorId: string }): Promise<void> {
    const after = { status: 'unpaid', via: 'course_resume_legacy' };
    for (const entityId of input.subscriptionIds)
      await this.audit.record({ actorId: input.actorId, entity: 'subscriptions', entityId, action: 'update', before: { status: 'paused' }, after });
    await this.alerts.evaluateStudents([input.studentId], { actorId: input.actorId });
  }
}
