import { studentAfterStop, type StudentStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

type Churn = { studentId: string; subscriptionId: string; actorId: string };

/**
 * The student's move to «توقف» (churned) after a stop (docs/18: a manual status, so no automatic rule moves
 * it back). Compare-and-set on the status read, audited as a status_change only when it changed a row.
 */
@Injectable()
export class StopStudentRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /** The status after the stop (unchanged when already churned, or when it moved meanwhile). */
  async churn(c: Churn): Promise<StudentStatus> {
    const read = await this.db.from('students').select('status').eq('id', c.studentId).single();
    if (read.error) throw dbError(read.error);
    const from = read.data.status;
    const to = studentAfterStop(from);
    if (to === null) return from;
    const { data, error } = await this.db
      .from('students')
      .update({ status: to })
      .eq('id', c.studentId)
      .eq('status', from)
      .select('id')
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return from;
    await this.audit.record({
      actorId: c.actorId,
      entity: 'students',
      entityId: c.studentId,
      action: 'status_change',
      before: { status: from },
      after: { status: to, from, reason: 'subscription_stopped', subscription_id: c.subscriptionId },
    });
    return to;
  }
}
