import {
  bookingKindOf,
  type BookingKind,
  type BookingRequest,
  type BookingResult,
} from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { NotificationPolicy } from '@/modules/messaging/notification-rules/policy/policy';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { teacherAlerts } from './teacher-alert.plan';
import { TeacherAlertRepo } from './teacher-alert.repo';

/** The shared services TeacherAlert talks to (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class TeacherAlertDeps {
  constructor(
    readonly push: PushService,
    readonly policy: NotificationPolicy,
    readonly sender: MessageSender,
  ) {}
}

export type BookedEvent = { req: BookingRequest; result: BookingResult };

/** The lessons whose teacher has new students (each teacher's first one names the time). */
interface NewStudents {
  lessonIds: readonly string[];
  studentIds: readonly string[];
  kind: BookingKind;
}

/**
 * R-NOT-03: after a successful booking (the admin's and the assistant's wizard, trial / package /
 * makeup; never an instant lesson, which does not go through here), each distinct teacher gets ONE
 * bell row (kind new_student, its own rule in PushService) and, only while the teacher_new_student rule
 * is ON (legacy: settings.teacher_whatsapp_new_student; unreadable = off, logged by the policy) and
 * teacher_new_student is approved, ONE queued WhatsApp row through the usual sender (its send gate,
 * kill switch and allow-list). Then the sender is kicked. Never throws: the booking is already saved.
 */
@Injectable()
export class TeacherAlert {
  private readonly log = new Logger(TeacherAlert.name);

  constructor(
    private readonly queries: TeacherAlertRepo,
    private readonly deps: TeacherAlertDeps,
  ) {}

  async afterBooking({ req, result }: BookedEvent): Promise<void> {
    const lessonIds = result.lessons.map((l) => l.id);
    await this.toTeachers({ lessonIds, studentIds: result.student_ids, kind: bookingKindOf(req) });
  }

  /** The same alert for any write that hands lessons to a teacher («تغيير المعلم»). */
  async toTeachers(input: NewStudents): Promise<void> {
    try {
      await this.alert(input);
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      this.log.warn(`teacher alert for lesson ${input.lessonIds[0] ?? '-'} failed: ${why}`);
    }
    void this.deps.sender.kick();
  }

  private async alert({ lessonIds, studentIds, kind }: NewStudents): Promise<void> {
    if (lessonIds.length === 0) return;
    const [lessons, students] = await Promise.all([
      this.queries.lessons(lessonIds),
      this.queries.students(studentIds),
    ]);
    const plans = teacherAlerts({ lessons, students, kind, now: new Date() });
    for (const { push } of plans) if (push) await this.deps.push.notifyProfiles(push);
    const rows = plans.flatMap((p) => (p.message ? [p.message] : []));
    if (rows.length === 0 || !(await this.deps.policy.isOn('teacher_new_student'))) return;
    if (await this.queries.approved()) await this.queries.queue(rows);
  }
}
