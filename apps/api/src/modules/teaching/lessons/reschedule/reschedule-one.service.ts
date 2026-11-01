import { isOpenLesson, type RescheduleRequest } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '@/common/auth/verify-token';
import type { ScheduleChange } from '@/common/infra/events/lesson-events';
import { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import { conflict } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { confirmationMessages, forMessages } from '@/modules/teaching/lessons/status/confirmation-messages';
import { studentIdsOf, type LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { invalidTransition } from '@/modules/teaching/lessons/status/transition';

/** The teacher and the family hear the move (ScheduleNotices, owner 2026-10-30). */
function movedNotice(old: LessonRow, lessonId: string, actor: AuthUser): ScheduleChange {
  return { kind: 'lesson_rescheduled', lessonId, fromStartsAt: old.starts_at, actorId: actor.id };
}

type One = Extract<RescheduleRequest, { scope: 'one' }>;
type RescheduleOneInput = { lessonId: string; body: One; actor: AuthUser };

/**
 * Move one occurrence (R-SCH-07, docs/10 route 8 `one`): the old row becomes `rescheduled`
 * (chargeable false) and a new row with the same rule_id + rescheduled_from_id takes the new
 * time; students copied, confirmation queued, one transaction. A clash (including an occurrence
 * its rule will still generate there) blocks unless the admin gives an override reason. The moved
 * row never holds its rule's slot, so moving back to the old time works. Returns the new id.
 */
@Injectable()
export class RescheduleOneService {
  constructor(
    private readonly store: LessonStore,
    private readonly teachers: TeachersRepo,
    private readonly checker: ConflictChecker,
  ) {}

  async reschedule({ lessonId, body, actor }: RescheduleOneInput): Promise<string> {
    const old = await this.store.get(lessonId);
    if (!isOpenLesson(old.status)) throw invalidTransition(old.status, 'reschedule');
    const teacherId = body.teacherId ?? old.teacher_id;
    const meetingLink = await this.linkFor(old, teacherId);
    const startsAt = new Date(body.startsAt);
    const duration = Date.parse(old.ends_at) - Date.parse(old.starts_at);
    const proposed = { starts_at: startsAt, ends_at: new Date(startsAt.getTime() + duration) };
    const studentIds = studentIdsOf(old);
    const conflicts = await this.checker.check({
      teacherId,
      studentIds,
      proposed: [proposed],
      excludeIds: [old.id],
    });
    if (conflicts.length > 0 && !body.override) throw conflict('conflict', { conflicts });
    const next = {
      id: randomUUID(),
      rule_id: old.rule_id,
      teacher_id: teacherId,
      starts_at: proposed.starts_at.toISOString(),
      ends_at: proposed.ends_at.toISOString(),
      meeting_link: meetingLink,
      override_reason: conflicts.length > 0 ? (body.override?.reason ?? null) : null,
      rescheduled_from_id: old.id,
      student_ids: studentIds,
    };
    const contacts = await this.store.queries.contacts(studentIds);
    const auto = await this.store.queries.meetingLinkAuto({ teacherId });
    await this.store.commit({
      change: {
        actor: actor.id,
        changes: [{ id: old.id, from_status: old.status, to_status: 'rescheduled', chargeable: false }],
        lessons: [next],
        messages: confirmationMessages(forMessages(next, auto), contacts),
      },
      audit: {
        entity: 'lessons',
        entityId: old.id,
        action: 'reschedule',
        before: { status: old.status, starts_at: old.starts_at, teacher_id: old.teacher_id },
        after: { lesson_id: next.id, starts_at: next.starts_at, teacher_id: teacherId, override_reason: next.override_reason },
      },
      transition: { from: old.status, event: 'reschedule' },
      notice: movedNotice(old, next.id, actor),
    });
    return next.id;
  }

  /** Same link as before; a substitute teacher brings their own fixed link (R-LES-01, issue B8). */
  private async linkFor(old: LessonRow, teacherId: string): Promise<string | null> {
    if (teacherId === old.teacher_id) return old.meeting_link;
    const substitute = await this.teachers.get(teacherId);
    if (!substitute) throw new NotFoundException();
    return substitute.meeting_link;
  }
}
