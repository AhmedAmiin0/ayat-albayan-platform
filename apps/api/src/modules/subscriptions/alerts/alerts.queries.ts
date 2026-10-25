import type { AdminTaskKind } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { NotificationPolicy } from '../../notification-rules/policy';
import { readAll, readChunked } from '../../scheduling/read-all';
import { dbError } from '../../../common/http/http';

export interface Recipient {
  studentName: string;
  guardianId: string;
  phone: string;
}

export interface RenewalMessage {
  recipient: Recipient;
  params: Record<string, string>;
  dedupKey: string;
  now: Date;
}

/** Reads and idempotent writes for the R-SUB-02 alerts (dedup keys, rule 8). */
@Injectable()
export class AlertsQueries {
  private readonly log = new Logger(AlertsQueries.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly policy: NotificationPolicy,
  ) {}

  async studentsOfLessons(lessonIds: readonly string[]): Promise<string[]> {
    const data = await readChunked(lessonIds, (chunk) =>
      this.db.from('lesson_students').select('student_id').in('lesson_id', chunk),
    );
    return [...new Set(data.map((r) => r.student_id))];
  }

  /** Every student with a package (the sweep), paged past PostgREST's max_rows. */
  async studentsWithPackages(): Promise<string[]> {
    const data = await readAll((from, to) =>
      this.db.from('subscriptions').select('student_id').order('id').range(from, to),
    );
    return [...new Set(data.map((r) => r.student_id))];
  }

  /**
   * insert … on conflict (dedup_key) do nothing. `title` keeps the balance line when it was raised
   * («فاضل حلقتين»): the UI fills {left} of dashboard.task.renewal_due with it.
   */
  /** true when the task is new (not already raised under its dedup key). */
  async raiseTask(task: { kind: AdminTaskKind; subjectId: string; dedupKey: string; title: string }): Promise<boolean> {
    const { data, error } = await this.db.from('admin_tasks').upsert(
      {
        kind: task.kind,
        subject_type: 'subscription',
        subject_id: task.subjectId,
        dedup_key: task.dedupKey,
        title: task.title,
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    ).select('id');
    if (error) throw dbError(error);
    return (data?.length ?? 0) > 0;
  }

  /**
   * Closes the open tasks about these packages whose dedup key is not in `keep` (done_by null: the
   * system closed it). The task stays in the list of done tasks for the record. A renewal message
   * still queued or held (auto_off) under a closed key (`renewal_due:{sub}`, the same key) is no
   * longer true — the package was renewed or paid — so it is failed as stale and never sent.
   */
  async closeTasks(input: { subjectIds: readonly string[]; keep: readonly string[]; now: Date }): Promise<void> {
    if (input.subjectIds.length === 0) return;
    let q = this.db
      .from('admin_tasks')
      .update({ done_at: input.now.toISOString(), done_by: null })
      .eq('subject_type', 'subscription')
      .in('subject_id', [...input.subjectIds])
      .is('done_at', null);
    if (input.keep.length > 0) q = q.not('dedup_key', 'in', `(${input.keep.map((k) => `"${k}"`).join(',')})`);
    const { data, error } = await q.select('dedup_key');
    if (error) throw dbError(error);
    const closed = (data ?? []).map((t) => t.dedup_key);
    if (closed.length === 0) return;
    const stale = await this.db
      .from('messages')
      .update({ status: 'failed', error_code: 'stale', error_text: 'renewal no longer due', next_attempt_at: null })
      .in('dedup_key', closed)
      .or('status.eq.queued,error_code.eq.auto_off');
    if (stale.error) throw dbError(stale.error);
  }

  async recipient(studentId: string): Promise<Recipient | null> {
    const { data, error } = await this.db
      .from('students')
      .select('name, guardian:guardians(id, phone_e164)')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data?.guardian) return null;
    return { studentName: data.name, guardianId: data.guardian.id, phone: data.guardian.phone_e164 };
  }

  /**
   * The guardian's renewal reminder, queued for the Phase 4 sender; deduped per package. Only while the
   * renewal_due notification rule is on (off or unreadable: nothing queued, logged; the task still stands).
   */
  async queueRenewal(m: RenewalMessage): Promise<void> {
    if (!(await this.policy.isOn('renewal_due'))) {
      this.log.log(`renewal_due off: ${m.dedupKey} not queued`);
      return;
    }
    const { error } = await this.db.from('messages').upsert(
      {
        direction: 'outbound',
        status: 'queued',
        phone_e164: m.recipient.phone,
        guardian_id: m.recipient.guardianId,
        template_key: 'renewal_due',
        template_params: m.params,
        dedup_key: m.dedupKey,
        scheduled_for: m.now.toISOString(),
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    );
    if (error) throw dbError(error);
  }
}
