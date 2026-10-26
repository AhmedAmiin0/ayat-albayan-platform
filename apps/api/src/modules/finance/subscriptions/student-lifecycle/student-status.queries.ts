import type { Json } from '@ab/db';
import type { StudentStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import type { StatusChangeRow } from './student-renewal.plan';

export type StatusMove = { studentId: string; from: StudentStatus; to: StudentStatus };
type MoveAudit = { actorId: string | null; after: Record<string, Json> };

/** The reads and the compare-and-set writes of the automatic student status changes (docs/11 §7). */
@Injectable()
export class StudentStatusQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async student(studentId: string): Promise<{ status: StudentStatus; tz: string } | null> {
    const { data, error } = await this.db.from('students').select('status, tz').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The newest students status_change audit row (manual or automatic), or null. */
  async lastStatusChange(studentId: string): Promise<StatusChangeRow | null> {
    const { data, error } = await this.db
      .from('audit_log')
      .select('after, at')
      .eq('entity', 'students')
      .eq('entity_id', studentId)
      .eq('action', 'status_change')
      .order('at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** A recorded payment (kind payment, amount > 0) of any of the student's packages still exists. */
  async hasPositivePayment(studentId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('payments')
      .select('id, subscription:subscriptions!inner(student_id)', { count: 'exact', head: true })
      .eq('subscription.student_id', studentId)
      .eq('kind', 'payment')
      .gt('amount', 0);
    if (error) throw dbError(error);
    return (count ?? 0) > 0;
  }

  /** Compare-and-set on the status read; audited only when it changed a row (idempotent, rule 8). */
  async move(m: StatusMove, audit: MoveAudit): Promise<boolean> {
    const { data, error } = await this.db
      .from('students')
      .update({ status: m.to })
      .eq('id', m.studentId)
      .eq('status', m.from)
      .select('id')
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return false;
    const entry = { actorId: audit.actorId, entity: 'students', entityId: m.studentId, action: 'status_change' };
    await this.audit.record({ ...entry, before: { status: m.from }, after: { status: m.to, ...audit.after } });
    return true;
  }
}
