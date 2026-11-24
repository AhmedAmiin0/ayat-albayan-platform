import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { InternalMeetingsRepo } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import { AUTO_END_REASON } from './max-duration.rule';

const sameInstant = (a: string | null | undefined, b: Date): boolean =>
  typeof a === 'string' && Date.parse(a) === b.getTime();

/** The audit_log row is written only when this call stamped ends_at. */
@Injectable()
export class MeetingAutoEnd {
  constructor(
    private readonly queries: InternalMeetingsRepo,
    private readonly audit: AuditService,
  ) {}

  /** true: ended now; false: it was already ended (a manual end or an earlier run won). */
  async end(id: string, now: Date): Promise<boolean> {
    const at = now.toISOString();
    const row = await this.queries.end(id, at);
    if (!sameInstant(row?.ends_at, now)) return false;
    await this.audit.record({
      actorId: null,
      entity: 'meetings',
      entityId: id,
      action: 'end',
      before: { ends_at: null },
      after: { ends_at: at, reason: AUTO_END_REASON },
    });
    return true;
  }
}
