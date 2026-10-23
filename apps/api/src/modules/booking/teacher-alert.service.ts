import { bookingKindOf, type BookingRequest, type BookingResult } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import { MessageSender } from '../whatsapp/message.sender';
import { BookingSettings } from './booking.settings';
import { teacherAlerts } from './teacher-alert.plan';
import { TeacherAlertQueries } from './teacher-alert.queries';

/** The shared services TeacherAlert talks to (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class TeacherAlertDeps {
  constructor(
    readonly push: PushService,
    readonly settings: BookingSettings,
    readonly sender: MessageSender,
  ) {}
}

export type BookedEvent = { req: BookingRequest; result: BookingResult };

/**
 * R-NOT-03: after a successful booking (the admin's and the assistant's wizard, trial / package /
 * makeup; never an instant lesson, which does not go through here), each distinct teacher gets ONE
 * bell row (kind new_student) and, only while settings.teacher_whatsapp_new_student is ON and
 * teacher_new_student is approved, ONE queued WhatsApp row through the usual sender (its send gate,
 * kill switch and allow-list). Then the sender is kicked. Never throws: the booking is already saved.
 */
@Injectable()
export class TeacherAlert {
  private readonly log = new Logger(TeacherAlert.name);

  constructor(
    private readonly queries: TeacherAlertQueries,
    private readonly deps: TeacherAlertDeps,
  ) {}

  async afterBooking({ req, result }: BookedEvent): Promise<void> {
    try {
      await this.alert({ req, result });
    } catch (e) {
      this.log.warn(`teacher alert for rule ${result.rule_id} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    void this.deps.sender.kick();
  }

  private async alert({ req, result }: BookedEvent): Promise<void> {
    if (result.lessons.length === 0) return;
    const [lessons, students] = await Promise.all([
      this.queries.lessons(result.lessons.map((l) => l.id)),
      this.queries.students(result.student_ids),
    ]);
    const plans = teacherAlerts({ lessons, students, kind: bookingKindOf(req), now: new Date() });
    for (const { push } of plans) if (push) await this.deps.push.notifyProfiles(push);
    const rows = plans.flatMap((p) => (p.message ? [p.message] : []));
    if (rows.length === 0 || !(await this.deps.settings.read()).teacher_whatsapp_new_student) return;
    if (await this.queries.approved()) await this.queries.queue(rows);
  }
}
