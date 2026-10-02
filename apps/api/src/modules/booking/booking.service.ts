import type { BookingRequest, BookingResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { BookingPlanner } from './booking.planner';
import { BookingQueries } from './booking.queries';

/**
 * POST /booking (R-SCH-06, R-SCH-04, R-LEAD-06): plan + conflict check, then ONE transaction
 * (create_booking RPC) for guardian/student, rule, lessons, lead status and queued messages,
 * then the audit row — with the override reason and the conflicts it overrode.
 */
@Injectable()
export class BookingService {
  constructor(
    private readonly planner: BookingPlanner,
    private readonly queries: BookingQueries,
    private readonly audit: AuditService,
  ) {}

  async book(req: BookingRequest, actorId: string): Promise<BookingResult> {
    const { payload, conflicts } = await this.planner.prepare(req);
    const result = await this.queries.createBooking(payload, actorId);
    await this.audit.record({
      actorId,
      entity: 'schedule_rules',
      entityId: result.rule_id,
      action: 'book',
      after: {
        package: req.package,
        lead_id: req.leadId ?? null,
        student_ids: result.student_ids,
        lessons: result.lessons.length,
        override_reason: req.override?.reason ?? null,
        conflicts: conflicts.map((c) => ({ ...c })),
      },
    });
    return result;
  }
}
