import type { Json } from '@ab/db';
import type { StudentStatus } from '@ab/catalog';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { readChunked } from '@/common/db/read-all';
import type { StatusChangeRow } from './student-renewal.plan';

type StatusMove = { studentId: string; from: StudentStatus; to: StudentStatus };
type MoveAudit = { actorId: string | null; after: Record<string, Json> };
interface StudentTzRow {
  status: StudentStatus;
  tz: string;
}

/**
 * The reads and the compare-and-set writes of the automatic student status changes (docs/11 §7).
 */
@Injectable()
export class StudentStatusRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async students(studentIds: readonly string[]): Promise<Map<string, StudentTzRow>> {
    const data = await readChunked(studentIds, (chunk) =>
      this.db.from('students').select('id, status, tz').in('id', chunk),
    );
    return new Map(data.map((s) => [s.id, { status: s.status, tz: s.tz }]));
  }

  async student(studentId: string): Promise<StudentTzRow | null> {
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

  /**
   * A recorded payment (kind payment, amount > 0) of any of the student's packages still exists.
   */
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

  /**
   * Compare-and-set on the status read; audited only when it changed a row (idempotent, rule 8).
   */
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
