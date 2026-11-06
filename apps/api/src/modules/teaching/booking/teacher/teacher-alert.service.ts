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
import { firstOrigin } from '@/common/http/public-origin';
import { TeacherLessonLinks } from '@/modules/teaching/lesson-links';
import { loadEnv } from '@/config/env/env';
import { teacherAlerts } from './teacher-alert.plan';
import { TeacherAlertRepo, type AlertLessonRow } from './teacher-alert.repo';
import { alertV3 } from './teacher-alert.v3';

/** The shared services TeacherAlert talks to (one injectable: constructors stay at ≤ 4 params). */
@Injectable()
export class TeacherAlertDeps {
  constructor(
    readonly push: PushService,
    readonly policy: NotificationPolicy,
    readonly sender: MessageSender,
    readonly links: TeacherLessonLinks,
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
    const base = { lessons, students, kind, now: new Date() };
    for (const { push } of teacherAlerts(base)) if (push) await this.deps.push.notifyProfiles(push);
    if (!(await this.deps.policy.isOn('teacher_new_student'))) return;
    const sendable = await this.queries.sendable();
    const v3 = sendable.has('teacher_lesson_v3') ? await this.v3(lessons) : undefined;
    // Only rows whose template can go (teacher_lesson_v3 or teacher_new_student, as the sender).
    const rows = teacherAlerts({ ...base, v3 }).flatMap((p) =>
      p.message && sendable.has(p.message.template_key) ? [p.message] : [],
    );
    if (rows.length > 0) await this.queries.queue(rows);
  }

  /** teacher_lesson_v3's room and signed links per first lesson (owner 2026-11-06). */
  private async v3(lessons: readonly AlertLessonRow[]) {
    const auto = await this.queries.academyAuto();
    const origin = firstOrigin(loadEnv().WEB_ORIGIN);
    return alertV3(lessons, { links: this.deps.links, auto, origin });
  }
}
