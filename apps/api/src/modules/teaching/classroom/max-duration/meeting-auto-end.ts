import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { InternalMeetingsQueries } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.queries';
import { AUTO_END_REASON } from './max-duration.rule';

const sameInstant = (a: string | null | undefined, b: Date): boolean =>
  typeof a === 'string' && Date.parse(a) === b.getTime();

/**
 * The database half of «إنهاء» for the max-duration job: the same ends_at stamp the manual end
 * writes (InternalMeetingsQueries.end, kept once), plus one audit_log row with no actor and the
 * reason auto_max_duration, written only when this call stamped it.
 */
@Injectable()
export class MeetingAutoEnd {
  constructor(
    private readonly queries: InternalMeetingsQueries,
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
